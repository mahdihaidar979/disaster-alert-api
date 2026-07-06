using DisasterSystem.API.Data;
using DisasterSystem.API.DTOs;
using DisasterSystem.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace DisasterSystem.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SafetyCheckInsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        private static DateTime ToLebanonTime(DateTime utcDate)
        {
            return utcDate.AddHours(3);
        }

        public SafetyCheckInsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [Authorize]
        [HttpPost]
        public async Task<IActionResult> CreateCheckIn(CreateSafetyCheckInDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);

            if (userIdClaim == null)
                return Unauthorized();

            int userId = int.Parse(userIdClaim.Value);

            var now = DateTime.UtcNow;

            var checkIn = new SafetyCheckIn
            {
                UserId = userId,
                Status = dto.Status,
                Latitude = dto.Latitude,
                Longitude = dto.Longitude,
                Message = dto.Message,
                CreatedAt = now,
                ExpiresAt = dto.Status == "NeedHelp"
                    ? now.AddHours(24)
                    : now.AddHours(6)
            };

            _context.SafetyCheckIns.Add(checkIn);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Safety check-in created successfully",
                expiresAt = checkIn.ExpiresAt
            });
        }

        [Authorize]
        [HttpGet("my-latest")]
        public async Task<IActionResult> GetMyLatest()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);

            if (userIdClaim == null)
                return Unauthorized();

            int userId = int.Parse(userIdClaim.Value);

            var latest = await _context.SafetyCheckIns
                .Where(x => x.UserId == userId)
                .Where(x => x.ExpiresAt > DateTime.UtcNow)
                .OrderByDescending(x => x.CreatedAt)
                .FirstOrDefaultAsync();

            if (latest == null)
                return NotFound();

            return Ok(latest);
        }

        [HttpGet("all")]
        public async Task<IActionResult> GetAll()
        {
            var data = await _context.SafetyCheckIns
                .Include(x => x.User)
                .Where(x => x.ExpiresAt > DateTime.UtcNow)
                .OrderByDescending(x => x.CreatedAt)
                .Select(x => new
                {
                    x.Id,
                    x.UserId,
                    UserName = x.User != null ? x.User.Name : "Unknown",
                    x.Status,
                    x.Latitude,
                    x.Longitude,
                    x.Message,
                    x.CreatedAt,
                    x.ExpiresAt
                })
                .ToListAsync();

            return Ok(data);
        }

        [HttpGet("nearby")]
        public async Task<IActionResult> GetNearby(
            double latitude,
            double longitude,
            double radiusKm = 5)
        {
            var all = await _context.SafetyCheckIns
                .Include(x => x.User)
                .Where(x => x.Status == "NeedHelp")
                .Where(x => x.ExpiresAt > DateTime.UtcNow)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();

            var result = all
                .Where(x =>
                {
                    double distance = GetDistanceKm(
                        latitude,
                        longitude,
                        x.Latitude,
                        x.Longitude);

                    return distance <= radiusKm;
                })
                .Select(x => new
                {
                    x.Id,
                    x.UserId,
                    UserName = x.User != null ? x.User.Name : "Unknown",
                    x.Status,
                    x.Latitude,
                    x.Longitude,
                    x.Message,
                    x.CreatedAt,
                    x.ExpiresAt
                });

            return Ok(result);
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("cleanup")]
        public async Task<IActionResult> CleanupExpired()
        {
            var expired = await _context.SafetyCheckIns
                .Where(x => x.ExpiresAt <= DateTime.UtcNow)
                .ToListAsync();

            _context.SafetyCheckIns.RemoveRange(expired);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Expired safety check-ins deleted",
                deletedCount = expired.Count
            });
        }

        private double GetDistanceKm(
            double lat1,
            double lon1,
            double lat2,
            double lon2)
        {
            double R = 6371;

            double dLat = DegreesToRadians(lat2 - lat1);
            double dLon = DegreesToRadians(lon2 - lon1);

            double a =
                Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(DegreesToRadians(lat1)) *
                Math.Cos(DegreesToRadians(lat2)) *
                Math.Sin(dLon / 2) *
                Math.Sin(dLon / 2);

            double c = 2 * Math.Atan2(
                Math.Sqrt(a),
                Math.Sqrt(1 - a));

            return R * c;
        }

        private double DegreesToRadians(double deg)
        {
            return deg * Math.PI / 180;
        }
    }
}