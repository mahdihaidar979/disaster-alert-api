using DisasterSystem.API.Data;
using DisasterSystem.API.Models;

namespace DisasterSystem.API.Services
{
    public class AdminLogService
    {
        private readonly ApplicationDbContext _context;

        public AdminLogService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task LogAsync(
            int adminId,
            string adminName,
            string action,
            string targetType,
            int? targetId,
            string description)
        {
            var log = new AdminLog
            {
                AdminId = adminId,
                AdminName = adminName,
                Action = action,
                TargetType = targetType,
                TargetId = targetId,
                Description = description,
                CreatedAt = DateTime.UtcNow
            };

            _context.AdminLogs.Add(log);

            await _context.SaveChangesAsync();
        }
    }
}