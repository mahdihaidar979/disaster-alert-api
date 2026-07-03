namespace DisasterSystem.API.DTOs
{
    public class SendChatMessageDto
    {
        public string Message { get; set; } = string.Empty;
        public string Channel { get; set; } = "General";
    }
}