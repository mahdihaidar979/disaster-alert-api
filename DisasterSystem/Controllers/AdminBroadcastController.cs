using DisasterSystem.API.Data;
using DisasterSystem.API.DTOs;
using DisasterSystem.API.Models;
using DisasterSystem.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DisasterSystem.API.Controllers
{
    [ApiController]
    [Route("api/admin/broadcast")]
    [Authorize(Roles = "Admin")]
    public class AdminBroadcastController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly FcmService _fcmService;


        public AdminBroadcastController(
            ApplicationDbContext context,
            FcmService fcmService)
        {
            _context = context;
            _fcmService = fcmService;
        }

        [HttpPost]
        public async Task<IActionResult> SendBroadcast([FromBody] AdminBroadcastDto dto)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(dto.Title))
                    return BadRequest(new { message = "Title is required." });

                if (string.IsNullOrWhiteSpace(dto.Message))
                    return BadRequest(new { message = "Message is required." });

                var users = await _context.Users
                    .Where(u => u.Role == "User")
                    .ToListAsync();

                if (!users.Any())
                    return BadRequest(new { message = "No normal users found." });

                foreach (var user in users)
                {
                    _context.Notifications.Add(new Notification
                    {
                        UserId = user.Id,
                        Title = dto.Title,
                        Message = dto.Message,
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                await _context.SaveChangesAsync();

                var tokens = users
                    .Where(u => !string.IsNullOrWhiteSpace(u.FcmToken))
                    .Select(u => u.FcmToken!)
                    .Distinct()
                    .ToList();

                foreach (var token in tokens)
                {
                    await _fcmService.SendToTokenAsync(
                        token,
                        dto.Title,
                        dto.Message
                    );
                }

                return Ok(new
                {
                    message = "Broadcast sent successfully.",
                    usersCount = users.Count,
                    pushTokensCount = tokens.Count
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
    }
}