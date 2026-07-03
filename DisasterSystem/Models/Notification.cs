namespace DisasterSystem.API.Models
{
    public class Notification
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public bool IsRead { get; set; } = false;
        public DateTime CreatedAt { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }

        public User? User { get; set; }
    }
}