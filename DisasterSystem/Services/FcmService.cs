using FirebaseAdmin;
using FirebaseAdmin.Messaging;
using Google.Apis.Auth.OAuth2;

namespace DisasterSystem.API.Services
{
    public class FcmService
    {
        private readonly ILogger<FcmService> _logger;

        public FcmService(ILogger<FcmService> logger)
        {
            _logger = logger;

            if (FirebaseApp.DefaultInstance == null)
            {
                FirebaseApp.Create(new AppOptions
                {
                    Credential = GoogleCredential.FromFile("firebase-service-account.json")
                });
            }
        }

        public async Task SendToTokenAsync(string token, string title, string body)
        {
            if (string.IsNullOrWhiteSpace(token))
                return;

            try
            {
                var message = new Message
                {
                    Token = token,
                    Notification = new Notification
                    {
                        Title = title,
                        Body = body
                    },
                    Data = new Dictionary<string, string>
                    {
                        { "click_action", "FLUTTER_NOTIFICATION_CLICK" },
                        { "type", "admin_report_alert" }
                    }
                };

                await FirebaseMessaging.DefaultInstance.SendAsync(message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "FCM send failed for token: {Token}", token);
            }
        }

        public async Task SendToMultipleTokensAsync(
            List<string> tokens,
            string title,
            string body)
        {
            if (tokens == null || tokens.Count == 0)
                return;

            var cleanTokens = tokens
                .Where(t => !string.IsNullOrWhiteSpace(t))
                .Distinct()
                .ToList();

            foreach (var token in cleanTokens)
            {
                await SendToTokenAsync(token, title, body);
            }
        }
    }
}