namespace DisasterSystem.API.DTOs
{
    public class RouteSafetyResultDto
    {
        public bool IsSafe { get; set; }
        public string Message { get; set; } = string.Empty;

        public List<object> IntersectingZones { get; set; } = new();
        public List<object> NearbyReports { get; set; } = new();
    }
}