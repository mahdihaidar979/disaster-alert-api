namespace DisasterSystem.API.Models
{
    public class SafetyCheckIn
    {
        public int Id { get; set; }

        public int UserId { get; set; }
        public User? User { get; set; }

        public string Status { get; set; } = string.Empty;
        // Safe / NeedHelp

        public double Latitude { get; set; }
        public double Longitude { get; set; }

        public string? Message { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime ExpiresAt { get; set; }
    }
}