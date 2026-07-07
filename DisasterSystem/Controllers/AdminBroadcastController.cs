using DisasterSystem.API.Data;
using DisasterSystem.API.DTOs;
using DisasterSystem.API.Models;
using DisasterSystem.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DisasterSystem.API.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace DisasterSystem.API.Controllers
{
    [ApiController]
    [Route("api/admin/broadcast")]
    [Authorize(Roles = "Admin")]
    public class AdminBroadcastController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly FcmService _fcmService;
        private readonly IHubContext<AlertsHub> _hubContext;


        public AdminBroadcastController(
            ApplicationDbContext context,
            FcmService fcmService,
            IHubContext<AlertsHub> hubContext
            )

        {
            _context = context;
            _fcmService = fcmService;
            _hubContext = hubContext;

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
                    var notification = new Notification
                    {
                        UserId = user.Id,
                        Title = dto.Title,
                        Message = dto.Message,
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow
                    };

                    _context.Notifications.Add(notification);

                    await _hubContext.Clients.All.SendAsync("ReceiveNotification", new
                    {
                        notification.UserId,
                        notification.Title,
                        notification.Message,
                        notification.IsRead,
                        notification.CreatedAt
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