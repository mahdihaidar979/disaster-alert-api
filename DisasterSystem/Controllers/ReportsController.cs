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
using NetTopologySuite.Geometries;

namespace DisasterSystem.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ReportsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IHubContext<AlertsHub> _hubContext;
        private readonly FcmService _fcmService;


        public ReportsController(
            ApplicationDbContext context,
            IHubContext<AlertsHub> hubContext,
            FcmService fcmService)
        {
            _context = context;
            _hubContext = hubContext;
            _fcmService = fcmService;
        }

        private static double GetDistanceInMeters(double lat1, double lon1, double lat2, double lon2)
        {
            const double R = 6371000;

            double dLat = (lat2 - lat1) * Math.PI / 180;
            double dLon = (lon2 - lon1) * Math.PI / 180;

            double a =
                Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(lat1 * Math.PI / 180) *
                Math.Cos(lat2 * Math.PI / 180) *
                Math.Sin(dLon / 2) *
                Math.Sin(dLon / 2);

            double c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));

            return R * c;
        }
        private async Task<(double confidence, string prediction, string reason)> CalculateAiScore(
            int userId,
            string type,
            int severity,
            double latitude,
            double longitude,
            bool hasImage)
        {
            double score = 0;

            // Severity
            score += severity switch
            {
                4 => 30,
                3 => 20,
                2 => 10,
                _ => 5
            };

            // Image attached
            if (hasImage)
                score += 15;

            // User reputation
            var user = await _context.Users.FindAsync(userId);

            if (user != null)
            {
                if (user.Reputation >= 80)
                    score += 20;
                else if (user.Reputation >= 50)
                    score += 10;
            }

            // Similar nearby reports in last 24h
            var yesterday = DateTime.UtcNow.AddHours(-24);

            var nearbyReports = await _context.Reports
               .Where(r =>
                    r.Type.ToLower() == type.ToLower() &&
                    r.Status != "Rejected" &&
                    r.CreatedAt >= yesterday)
                    .ToListAsync();

            int nearbyCount = 0;

            foreach (var r in nearbyReports)
            {
                if (r.Location == null)
                    continue;

                var distance = GetDistanceInMeters(
                    latitude,
                    longitude,
                    r.Location.Y,
                    r.Location.X);

                if (distance <= 500)
                {
                    nearbyCount++;
                }
            }

            score += Math.Min(nearbyCount * 20, 40);

            score = Math.Min(score, 100);

            string prediction =
                score >= 80 ? "Highly Likely Real" :
                score >= 60 ? "Likely Real" :
                score >= 40 ? "Needs Review" :
                "Suspicious";

            var reason =
    $"Severity: {severity}. " +
    $"Image: {(hasImage ? "attached" : "not attached")}. " +
    $"Nearby reports counted: {nearbyCount}. " +
    $"User reputation: {(user?.Reputation ?? 0)}.";

            return (score, prediction, reason);
        }

        private async Task<bool> HasRecentAiVerifiedReportNearby(
    string type,
    double latitude,
    double longitude)
        {
            var cooldownTime = DateTime.UtcNow.AddHours(-2);

            var recentReports = await _context.Reports
                .Where(r =>
                    r.Type.ToLower() == type.ToLower() &&
                    r.Status == "Verified" &&
                    r.AiConfidence >= 80 &&
                    r.CreatedAt >= cooldownTime)
                .ToListAsync();

            foreach (var r in recentReports)
            {
                if (r.Location == null)
                    continue;

                var distance = GetDistanceInMeters(
                    latitude,
                    longitude,
                    r.Location.Y,
                    r.Location.X);

                if (distance <= 500)
                    return true;
            }

            return false;
        }

        [HttpPost]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> CreateReport([FromForm] CreateReportDto dto)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (string.IsNullOrWhiteSpace(userIdClaim))
                    return Unauthorized("Invalid token.");

                var userId = int.Parse(userIdClaim);

                var user = await _context.Users.FindAsync(userId);

                if (user == null)
                    return NotFound("User not found.");

                if (user.IsBanned)
                    return Unauthorized("Your account has been banned.");

                string? imageUrl = null;

                if (dto.Image != null && dto.Image.Length > 0)
                {
                    var folder = Path.Combine(
                        Directory.GetCurrentDirectory(),
                        "wwwroot",
                        "uploads",
                        "reports"
                    );

                    if (!Directory.Exists(folder))
                        Directory.CreateDirectory(folder);

                    var fileName = $"{Guid.NewGuid()}{Path.GetExtension(dto.Image.FileName)}";
                    var path = Path.Combine(folder, fileName);

                    using (var stream = new FileStream(path, FileMode.Create))
                    {
                        await dto.Image.CopyToAsync(stream);
                    }

                    imageUrl = $"/uploads/reports/{fileName}";
                }

                var aiResult = await CalculateAiScore(
                        userId,
                        dto.Type,
                        dto.Severity,
                        dto.Latitude,
                        dto.Longitude,
                        dto.Image != null
                    );


                var alreadyAiVerifiedNearby =
                    await HasRecentAiVerifiedReportNearby(
                        dto.Type,
                        dto.Latitude,
                        dto.Longitude
                    );

                var finalPrediction = aiResult.prediction;

                if (aiResult.confidence >= 80 && alreadyAiVerifiedNearby)
                {
                    finalPrediction = "Likely Duplicate - Needs Admin Review";
                }


                var report = new Report
                {
                    UserId = userId,
                    Type = dto.Type,
                    Description = dto.Description,
                    Severity = dto.Severity,

                    AiConfidence = aiResult.confidence,
                    AiPrediction = finalPrediction,
                    AiReason = aiResult.reason,

                    Status = aiResult.confidence >= 80 && !alreadyAiVerifiedNearby
                        ? "Verified"
                        : "Pending",
                    Score = 0,
                    CreatedAt = DateTime.UtcNow,
                    ImageUrl = imageUrl,
                    Location = new Point(dto.Longitude, dto.Latitude)
                    {
                        SRID = 4326
                    }
                };

                _context.Reports.Add(report);
                await _context.SaveChangesAsync();

                await _hubContext.Clients.All.SendAsync("ReportSubmitted", new
                {
                    report.Id,
                    report.Type,
                    report.Description,
                    report.Severity,
                    report.Status,
                    report.CreatedAt,
                    report.AiConfidence,
                    report.AiPrediction,
                    UserName = user.Name,
                    Latitude = report.Location != null ? report.Location.Y : 0,
                    Longitude = report.Location != null ? report.Location.X : 0,
                    report.ImageUrl,
                    VotesCount = 0
                });

                var adminTokens = await _context.Users
                    .Where(u =>
                        u.Role == "Admin" &&
                        u.FcmToken != null &&
                        u.FcmToken != "")
                    .Select(u => u.FcmToken!)
                    .Distinct()
                    .ToListAsync();

                foreach (var token in adminTokens)
                {
                    await _fcmService.SendToTokenAsync(
                        token,
                        "🚨 New Report",
                        $"{report.Type} report needs admin review. Severity: {report.Severity}/4"
                    );
                }

                await _hubContext.Clients.All.SendAsync("NewPendingReport", new
                {
                    report.Id,
                    report.Type,
                    report.Description,
                    report.Severity,
                    report.Status,
                    report.CreatedAt,
                    report.AiConfidence,
                    report.AiPrediction,
                    report.ImageUrl,
                    Latitude = report.Location.Coordinate.Y,
                    Longitude = report.Location.Coordinate.X
                });

                return Ok(new
                {
                    message = "Report submitted. Waiting for admin approval.",
                    report.Id,
                    report.Status
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = ex.Message,
                    inner = ex.InnerException?.Message
                });
            }
        }

        [AllowAnonymous]
        [HttpGet]
        public async Task<IActionResult> GetAllReports()
        {
            var reports = await _context.Reports
                .Where(r => r.Status == "Verified")
                .AsNoTracking()
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            var result = reports.Select(r => new
            {
                r.Id,
                r.Type,
                r.Description,
                r.Severity,
                Score = r.Score,
                r.AiConfidence,
                r.AiPrediction,
                r.Status,
                r.CreatedAt,
                r.ImageUrl,
                Latitude = r.Location != null ? r.Location.Coordinate.Y : 0,
                Longitude = r.Location != null ? r.Location.Coordinate.X : 0
            });

            return Ok(result);
        }

        [AllowAnonymous]
        [HttpGet("nearby")]
        public async Task<IActionResult> GetNearbyReports(
            [FromQuery] double latitude,
            [FromQuery] double longitude,
            [FromQuery] double radiusInMeters = 3000)
        {
            var reports = await _context.Reports
                .Where(r => r.Status == "Verified")
                .AsNoTracking()
                .ToListAsync();

            var nearby = reports
                .Where(r =>
                {
                    if (r.Location == null) return false;

                    var dist = GetDistanceInMeters(
                        latitude,
                        longitude,
                        r.Location.Coordinate.Y,
                        r.Location.Coordinate.X
                    );

                    return dist <= radiusInMeters;
                })
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new
                {
                    r.Id,
                    r.Type,
                    r.Description,
                    r.Severity,
                    Score = r.Score,
                    r.AiConfidence,
                    r.AiPrediction,
                    r.Status,
                    r.CreatedAt,
                    r.ImageUrl,
                    Latitude = r.Location != null ? r.Location.Coordinate.Y : 0,
                    Longitude = r.Location != null ? r.Location.Coordinate.X : 0
                });

            return Ok(nearby);
        }

        [HttpGet("my")]
        public async Task<IActionResult> GetMyReports()
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (string.IsNullOrWhiteSpace(userIdClaim))
                    return Unauthorized("Invalid token.");

                var userId = int.Parse(userIdClaim);

                var reports = await _context.Reports
                    .AsNoTracking()
                    .Where(r => r.UserId == userId)
                    .OrderByDescending(r => r.CreatedAt)
                    .ToListAsync();

                var result = reports.Select(r => new
                {
                    r.Id,
                    r.UserId,
                    r.Type,
                    r.Description,
                    r.Severity,
                    r.Score,
                    r.Status,
                    r.CreatedAt,
                    r.ImageUrl,
                    r.AiConfidence,
                    r.AiPrediction,
                    Latitude = r.Location != null ? r.Location.Coordinate.Y : 0,
                    Longitude = r.Location != null ? r.Location.Coordinate.X : 0
                });

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = ex.Message,
                    inner = ex.InnerException?.Message
                });
            }
        }
    }
}