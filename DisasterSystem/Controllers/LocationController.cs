using System.Security.Claims;
using DisasterSystem.API.Data;
using DisasterSystem.API.DTOs;
using DisasterSystem.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DisasterSystem.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LocationController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public LocationController(ApplicationDbContext context)
        {
            _context = context;
        }

        [Authorize]
        [HttpPost("update")]
        public async Task<IActionResult> UpdateLocation(
            [FromBody] UpdateUserLocationDto dto)
        {
            var userIdClaim =
                User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrWhiteSpace(userIdClaim))
                return Unauthorized("Invalid token.");

            var userId = int.Parse(userIdClaim);

            var user = await _context.Users.FindAsync(userId);

            if (user == null)
                return NotFound("User not found.");

            if (user.IsBanned)
                return Unauthorized("Your account has been banned.");

            if (!user.LocationTrackingEnabled)
                return BadRequest("Location tracking is disabled.");

            if (dto.Latitude < -90 || dto.Latitude > 90)
                return BadRequest("Invalid latitude.");

            if (dto.Longitude < -180 || dto.Longitude > 180)
                return BadRequest("Invalid longitude.");

            var existing =
                await _context.UserLocation
                    .FirstOrDefaultAsync(x => x.UserId == userId);

            if (existing == null)
            {
                existing = new UserLocation
                {
                    UserId = userId,
                    Latitude = dto.Latitude,
                    Longitude = dto.Longitude,
                    UpdatedAt = DateTime.UtcNow,
                    IsOnline = true
                };

                _context.UserLocation.Add(existing);
            }
            else
            {
                existing.Latitude = dto.Latitude;
                existing.Longitude = dto.Longitude;
                existing.UpdatedAt = DateTime.UtcNow;
                existing.IsOnline = true;

            }

            user.Latitude = dto.Latitude;
            user.Longitude = dto.Longitude;
            user.LocationTrackingEnabled = true;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Location updated",
                userId,
                dto.Latitude,
                dto.Longitude,
                updatedAt = DateTime.UtcNow
            });
        }

        [Authorize]
        [HttpPost("enable")]
        public async Task<IActionResult> EnableLocation()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrWhiteSpace(userIdClaim))
                return Unauthorized("Invalid token.");

            var userId = int.Parse(userIdClaim);

            var user = await _context.Users.FindAsync(userId);

            if (user == null)
                return NotFound("User not found.");

            user.LocationTrackingEnabled = true;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Location tracking enabled" });
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("live")]
        public async Task<IActionResult> GetLiveLocations()
        {
            var locations =
                await _context.UserLocation
                    .Include(x => x.User)
                    .AsNoTracking()
                    .OrderByDescending(x => x.UpdatedAt)
                    .Select(x => new
                    {
                        x.UserId,
                        x.Latitude,
                        x.Longitude,
                        x.UpdatedAt,

                        UserName = x.User.Name,
                        UserEmail = x.User.Email,
                        UserRole = x.User.Role,
                        IsBanned = x.User.IsBanned,

                        IsOnline = x.IsOnline
                    })
                    .ToListAsync();

            return Ok(locations);
        }
        [Authorize]
        [HttpPost("disable")]
        public async Task<IActionResult> DisableLocation()
        {
            var userIdClaim =
                User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrWhiteSpace(userIdClaim))
                return Unauthorized("Invalid token.");

            var userId = int.Parse(userIdClaim);

            var user = await _context.Users.FindAsync(userId);

            if (user == null)
                return NotFound("User not found.");

            var existing = await _context.UserLocation
                .FirstOrDefaultAsync(x => x.UserId == userId);

            if (existing != null)
            {
                existing.IsOnline = false;
                existing.UpdatedAt = DateTime.UtcNow;
            }

            user.Latitude = null;
            user.Longitude = null;
            user.LocationTrackingEnabled = false;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Location tracking disabled"
            });
        }
    }
}