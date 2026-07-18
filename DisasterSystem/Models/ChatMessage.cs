namespace DisasterSystem.API.Models
{
    public class ChatMessage
    {
        public int Id { get; set; }

        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;

        public string Message { get; set; } = string.Empty;

        public string Channel { get; set; } = "General";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public User? User { get; set; }
     
    }
}