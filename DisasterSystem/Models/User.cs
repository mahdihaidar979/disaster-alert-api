using System.ComponentModel.DataAnnotations.Schema;


namespace DisasterSystem.API.Models
{
    public class User
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Role { get; set; } = "User";
        public int Reputation { get; set; } = 0;
        public DateTime CreatedAt { get; set; }
        

        public bool IsBanned { get; set; } = false;
        public bool LocationTrackingEnabled { get; set; } = true;

        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public string? FcmToken { get; set; }

        [Column("photo_url")]
        public string? PhotoUrl { get; set; }
        public byte[]? PhotoBytes { get; set; }
        public string? PhotoContentType { get; set; }
        public List<Report> Reports { get; set; } = new();
        public List<ReportVote> ReportVotes { get; set; } = new();
        public List<Notification> Notifications { get; set; } = new();
    }
}