namespace DisasterSystem.API.Models
{
    public class AdminLog
    {
        public int Id { get; set; }

        public int AdminId { get; set; }

        public string AdminName { get; set; } = string.Empty;

        public string Action { get; set; } = string.Empty;

        public string TargetType { get; set; } = string.Empty;

        public int? TargetId { get; set; }

        public string Description { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public User Admin { get; set; } = null!;
    }
}