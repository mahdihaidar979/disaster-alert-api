using System.Security.Claims;
using DisasterSystem.API.Data;
using DisasterSystem.API.DTOs;
using DisasterSystem.API.Hubs;
using DisasterSystem.API.Models;
using DisasterSystem.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace DisasterSystem.API.Controllers
{
    [ApiController]
    [Route("api/admin")]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IHubContext<AlertsHub> _hubContext;
        private readonly FcmService _fcmService;
        private readonly AdminLogService _adminLogService;


        public AdminController(
            ApplicationDbContext context,
            IHubContext<AlertsHub> hubContext,
            FcmService fcmService,
            AdminLogService adminLogService)
        {
            _context = context;
            _hubContext = hubContext;
            _fcmService = fcmService;
            _adminLogService = adminLogService;
        }

        private (int Id, string Name) GetCurrentAdmin()
        {
            var adminId = int.Parse(
                User.FindFirst(ClaimTypes.NameIdentifier)!.Value
            );

            var adminName =
                User.FindFirst(ClaimTypes.Name)?.Value
                ?? User.FindFirst(ClaimTypes.Email)?.Value
                ?? "Admin";

            return (adminId, adminName);
        }

        private static double GetDistanceInMeters(
            double latitude1,
            double longitude1,
            double latitude2,
            double longitude2)
        {
            const double earthRadiusMeters = 6371000;

            double dLat = DegreesToRadians(latitude2 - latitude1);
            double dLon = DegreesToRadians(longitude2 - longitude1);

            double a =
                Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(DegreesToRadians(latitude1)) *
                Math.Cos(DegreesToRadians(latitude2)) *
                Math.Sin(dLon / 2) *
                Math.Sin(dLon / 2);

            double c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));

            return earthRadiusMeters * c;
        }

        private static double DegreesToRadians(double degrees)
        {
            return degrees * Math.PI / 180.0;
        }

        [HttpGet("dashboard/stats")]
        public async Task<IActionResult> GetDashboardStats()
        {
            var reports = await _context.Reports
                .AsNoTracking()
                .ToListAsync();

            var totalReports = reports.Count;
            var pendingReports = reports.Count(r => r.Status == "Pending");
            var verifiedReports = reports.Count(r => r.Status == "Verified");
            var rejectedReports = reports.Count(r => r.Status == "Rejected");
            var resolvedReports = reports.Count(r => r.Status == "Resolved");

            var lowSeverity = reports.Count(r => r.Severity == 1);
            var mediumSeverity = reports.Count(r => r.Severity == 2);
            var highSeverity = reports.Count(r => r.Severity == 3);
            var criticalSeverity = reports.Count(r => r.Severity == 4);

            var usersCount = await _context.Users.CountAsync();

            return Ok(new
            {
                totalReports,
                pendingReports,
                verifiedReports,
                rejectedReports,
                resolvedReports,
                usersCount,
                severity = new
                {
                    low = lowSeverity,
                    medium = mediumSeverity,
                    high = highSeverity,
                    critical = criticalSeverity
                }
            });
        }

        [HttpGet("reports/pending")]
        public async Task<IActionResult> GetPendingReports()
        {
            var reports = await _context.Reports
                .Include(r => r.User)
                .Include(r => r.ReportVotes)
                .AsNoTracking()
                .Where(r => r.Status == "Pending")
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new
                {
                    r.Id,
                    r.Type,
                    r.Description,
                    r.Severity,
                    r.Score,
                    r.Status,
                    r.AiConfidence,
                    r.AiPrediction,
                    r.AiReason,
                    r.CreatedAt,
                    r.UserId,
                    UserName = r.User != null ? r.User.Name : null,
                    Latitude = r.Location != null ? r.Location.Coordinate.Y : 0,
                    Longitude = r.Location != null ? r.Location.Coordinate.X : 0,
                    r.ImageUrl,
                    VotesCount = r.ReportVotes.Count()
                })
                .ToListAsync();

            return Ok(reports);
        }

        private async Task<string> GetLocationNameAsync(double latitude, double longitude)
        {
            try
            {
                var apiKey = HttpContext.RequestServices
                    .GetRequiredService<IConfiguration>()["GoogleMaps:ApiKey"];

                if (string.IsNullOrWhiteSpace(apiKey))
                    return "Unknown location";

                using var httpClient = new HttpClient();

                var url =
                    $"https://maps.googleapis.com/maps/api/geocode/json" +
                    $"?latlng={latitude},{longitude}" +
                    $"&key={apiKey}";

                var response = await httpClient.GetAsync(url);
                var json = await response.Content.ReadAsStringAsync();

                using var doc = System.Text.Json.JsonDocument.Parse(json);

                var status = doc.RootElement.GetProperty("status").GetString();

                if (status != "OK")
                    return "Unknown location";

                var results = doc.RootElement.GetProperty("results");

                if (results.GetArrayLength() == 0)
                    return "Unknown location";

                return results[0].GetProperty("formatted_address").GetString()
                    ?? "Unknown location";
            }
            catch
            {
                return "Unknown location";
            }
        }


        private object BuildRealtimeReportPayload(Report report)
        {
            var latitude = report.Location != null ? report.Location.Coordinate.Y : 0;
            var longitude = report.Location != null ? report.Location.Coordinate.X : 0;

            return new
            {
                report.Id,
                report.Type,
                report.Description,
                report.Severity,
                report.Score,
                report.Status,
                report.AiConfidence,
                report.AiPrediction,
                report.AiReason,
                report.CreatedAt,
                report.UserId,
                UserName = report.User != null ? report.User.Name : null,
                Latitude = latitude,
                Longitude = longitude,
                report.ImageUrl,
                VotesCount = report.ReportVotes != null ? report.ReportVotes.Count : 0
            };
        }

        [HttpGet("reports/all")]
        public async Task<IActionResult> GetAllReports()
        {
            var reports = await _context.Reports
                .Include(r => r.User)
                .Include(r => r.ReportVotes)
                .AsNoTracking()
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            var result = new List<object>();

            foreach (var r in reports)
            {
                var latitude = r.Location != null ? r.Location.Coordinate.Y : 0;
                var longitude = r.Location != null ? r.Location.Coordinate.X : 0;

                result.Add(new
                {
                    r.Id,
                    r.Type,
                    r.Description,
                    r.Severity,
                    r.Score,
                    r.Status,
                    r.AiConfidence,
                    r.AiPrediction,
                    r.AiReason,
                    r.CreatedAt,
                    r.UserId,
                    UserName = r.User != null ? r.User.Name : null,
                    Latitude = latitude,
                    Longitude = longitude,
                    LocationName = await GetLocationNameAsync(latitude, longitude),
                    r.ImageUrl,
                    VotesCount = r.ReportVotes.Count
                });
            }

            return Ok(result);
        }

        [HttpGet("reports/status/{status}")]
        public async Task<IActionResult> GetReportsByStatus(string status)
        {
            var allowedStatuses = new[] { "Pending", "Verified", "Rejected", "Resolved" };

            if (!allowedStatuses.Contains(status))
                return BadRequest("Invalid status.");

            var reports = await _context.Reports
                .Include(r => r.User)
                .Include(r => r.ReportVotes)
                .AsNoTracking()
                .Where(r => r.Status == status)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            var result = new List<object>();

            foreach (var r in reports)
            {
                var latitude = r.Location != null ? r.Location.Coordinate.Y : 0;
                var longitude = r.Location != null ? r.Location.Coordinate.X : 0;

                result.Add(new
                {
                    r.Id,
                    r.Type,
                    r.Description,
                    r.Severity,
                    r.Score,
                    r.Status,
                    r.AiConfidence,
                    r.AiPrediction,
                    r.AiReason,
                    r.CreatedAt,
                    r.UserId,
                    UserName = r.User != null ? r.User.Name : null,
                    Latitude = latitude,
                    Longitude = longitude,
                    LocationName = await GetLocationNameAsync(latitude, longitude),
                    r.ImageUrl,
                    VotesCount = r.ReportVotes.Count
                });
            }

            return Ok(result);
        }

        [HttpGet("users/all")]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _context.Users
                .AsNoTracking()
                .OrderByDescending(u => u.CreatedAt)
                .Select(u => new
                {
                    u.Id,
                    u.Name,
                    u.Email,
                    u.Role,
                    u.Reputation,
                    u.CreatedAt,
                    u.IsBanned,
                    ReportsCount = u.Reports.Count()
                })
                .ToListAsync();

            return Ok(users);
        }

        [HttpPut("reports/{id}/status")]
        public async Task<IActionResult> UpdateReportStatus(int id, UpdateReportStatusDto dto)
        {
            var allowedStatuses = new[] { "Pending", "Verified", "Rejected", "Resolved" };

            if (!allowedStatuses.Contains(dto.Status))
                return BadRequest("Invalid status.");

            var report = await _context.Reports
                .Include(r => r.User)
                .Include(r => r.ReportVotes)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (report == null)
                return NotFound("Report not found.");

            var oldStatus = report.Status;
            report.Status = dto.Status;

            var admin = GetCurrentAdmin();

            await _adminLogService.LogAsync(
                admin.Id,
                admin.Name,
                $"{dto.Status} Report",
                "Report",
                report.Id,
                $"{dto.Status} report #{report.Id}"
            );

            await _context.SaveChangesAsync();

            if (oldStatus != "Verified" && dto.Status == "Verified")
            {
                await SendNotificationsForVerifiedReport(report);
            }

            await _hubContext.Clients.All.SendAsync(
                "ReportStatusUpdated",
                BuildRealtimeReportPayload(report)
            );

            return Ok(new
            {
                message = "Report status updated successfully",
                report = BuildRealtimeReportPayload(report)
            });
        }



        private async Task SendNotificationsForVerifiedReport(Report report)
        {
            if (report.Location == null)
                return;

            var users = await _context.Users
                .Where(u =>
                    u.Latitude != null &&
                    u.Longitude != null &&
                    u.Id != report.UserId &&
                    !u.IsBanned)
                .ToListAsync();

            var sentTokens = new HashSet<string>();

            foreach (var user in users)
            {
                double distanceInMeters = GetDistanceInMeters(
                    report.Location.Y,
                    report.Location.X,
                    user.Latitude!.Value,
                    user.Longitude!.Value
                );

                if (distanceInMeters <= 5000)
                {
                    _context.Notifications.Add(new Notification
                    {
                        UserId = user.Id,
                        Title = "Verified Nearby Disaster Alert",
                        Message =
                            $"⚠️ {report.Type} has been verified by admin.\n" +
                            $"Severity: {report.Severity}/4\n" +
                            $"Distance: {(distanceInMeters / 1000):0.00} km away\n" +
                            $"Status: {report.Status}\n" +
                            $"Photo: {(string.IsNullOrWhiteSpace(report.ImageUrl) ? "No photo attached" : "Photo attached")}\n" +
                            $"Description: {(string.IsNullOrWhiteSpace(report.Description) ? "No description provided" : report.Description)}",
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow,
                        Latitude = report.Location.Y,
                        Longitude = report.Location.X
                    });

                    if (!string.IsNullOrWhiteSpace(user.FcmToken) &&
                        sentTokens.Add(user.FcmToken))
                    {
                        await _fcmService.SendToTokenAsync(
                            user.FcmToken,
                            "🚨 Disaster Alert",
                            $"{report.Type} verified near you! Stay safe."
                        );
                    }
                }
            }

            await _context.SaveChangesAsync();

            await _hubContext.Clients.All.SendAsync("ReceiveAlert", new
            {
                report.Id,
                report.Type,
                report.Description,
                report.Severity,
                report.ImageUrl,
                Latitude = report.Location.Y,
                Longitude = report.Location.X,
                Message = $"✅ Verified alert: {report.Type} near you!"
            });
        }

        [HttpDelete("reports/{id}")]
        public async Task<IActionResult> DeleteReport(int id)
        {
            var report = await _context.Reports
                .Include(r => r.User)
                .Include(r => r.ReportVotes)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (report == null)
                return NotFound("Report not found.");

            var admin = GetCurrentAdmin();

            await _adminLogService.LogAsync(
                admin.Id,
                admin.Name,
                "Delete Report",
                "Report",
                report.Id,
                $"Deleted report #{report.Id}"
            );

            var deletedReportPayload = BuildRealtimeReportPayload(report);

            _context.Reports.Remove(report);
            await _context.SaveChangesAsync();

            await _hubContext.Clients.All.SendAsync("ReportDeleted", new
            {
                reportId = id,
                report = deletedReportPayload
            });

            return Ok(new
            {
                message = "Report deleted successfully"
            });
        }

        [HttpPut("users/{id}/role")]
        public async Task<IActionResult> UpdateUserRole(int id, [FromBody] string role)
        {
            var allowedRoles = new[] { "Admin", "User" };

            if (!allowedRoles.Contains(role))
                return BadRequest("Invalid role.");

            var user = await _context.Users.FindAsync(id);

            if (user == null)
                return NotFound("User not found.");

            user.Role = role;

            var admin = GetCurrentAdmin();

            await _adminLogService.LogAsync(
                admin.Id,
                admin.Name,
                role == "Admin" ? "Make Admin" : "Remove Admin",
                "User",
                user.Id,
                role == "Admin"
                    ? $"Promoted user {user.Email} to Admin"
                    : $"Removed Admin role from {user.Email}"
            );

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = $"User role updated to {role}"
            });
        }

        [HttpDelete("users/{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var user = await _context.Users
                .Include(u => u.Reports)
                .FirstOrDefaultAsync(u => u.Id == id);

            if (user == null)
                return NotFound("User not found.");

            var admin = GetCurrentAdmin();

            await _adminLogService.LogAsync(
                admin.Id,
                admin.Name,
                "Delete User",
                "User",
                user.Id,
                $"Deleted user {user.Email}"
            );

            _context.Reports.RemoveRange(user.Reports);
            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "User deleted successfully"
            });
        }

        [HttpPut("users/{id}/ban")]
        public async Task<IActionResult> ToggleBan(int id)
        {
            var user = await _context.Users.FindAsync(id);

            if (user == null)
                return NotFound("User not found.");

            user.IsBanned = !user.IsBanned;

            var admin = GetCurrentAdmin();

            await _adminLogService.LogAsync(
                admin.Id,
                admin.Name,
                user.IsBanned ? "Ban User" : "Unban User",
                "User",
                user.Id,
                user.IsBanned
                    ? $"Banned user {user.Email}"
                    : $"Unbanned user {user.Email}"
            );

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = user.IsBanned ? "User banned" : "User unbanned",
                user.IsBanned
            });
        }

        [HttpGet("logs")]
        public async Task<IActionResult> GetAdminLogs()
        {
            var logs = await _context.AdminLogs
                .AsNoTracking()
                .OrderByDescending(x => x.CreatedAt)
                .Take(200)
                .ToListAsync();

            return Ok(logs);
        }
    }
}