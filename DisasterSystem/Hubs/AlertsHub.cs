using Microsoft.AspNetCore.SignalR;

namespace DisasterSystem.API.Hubs
{
    public class AlertsHub : Hub
    {
        public async Task JoinGeneralAlerts()
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, "general-alerts");
        }

        public async Task LeaveGeneralAlerts()
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, "general-alerts");
        }
    }
}