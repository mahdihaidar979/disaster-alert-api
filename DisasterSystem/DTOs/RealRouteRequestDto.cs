namespace DisasterSystem.API.DTOs
{
    public class RealRouteRequestDto
    {
        public double StartLatitude { get; set; }
        public double StartLongitude { get; set; }

        public double EndLatitude { get; set; }
        public double EndLongitude { get; set; }

        public bool SafeMode { get; set; }

        public string TravelMode { get; set; } = "DRIVE";

        public int RouteOptionIndex { get; set; } = 0;
    }
}