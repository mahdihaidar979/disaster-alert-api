using DisasterSystem.API.Data;
using DisasterSystem.API.DTOs;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;

namespace DisasterSystem.API.Services
{
    public class RealRouteSafetyService
    {
        private readonly ApplicationDbContext _context;
        private readonly GoogleRoutesService _googleRoutesService;
        private readonly PolylineDecoderService _polylineDecoderService;

        public RealRouteSafetyService(
            ApplicationDbContext context,
            GoogleRoutesService googleRoutesService,
            PolylineDecoderService polylineDecoderService)
        {
            _context = context;
            _googleRoutesService = googleRoutesService;
            _polylineDecoderService = polylineDecoderService;
        }

        public async Task<RealRouteResultDto> GetSafeRouteAnalysisAsync(
    RealRouteRequestDto dto,
    CancellationToken cancellationToken = default)
        {
            var routes = await _googleRoutesService.ComputeRoutesAsync(
                dto,
                cancellationToken
            );

            if (routes == null || routes.Count == 0)
            {
                return new RealRouteResultDto
                {
                    IsSafe = false,
                    Message = "No route was returned by Google Routes API."
                };
            }

            var analyzedRoutes = new List<RealRouteResultDto>();

            foreach (var route in routes)
            {
                var analysis = await AnalyzeRouteAsync(route, cancellationToken);
                analyzedRoutes.Add(analysis);
            }

            if (!dto.SafeMode)
            {
                var normalIndex = Math.Abs(dto.RouteOptionIndex) % analyzedRoutes.Count;
                var normalRoute = analyzedRoutes[normalIndex];
                normalRoute.Message = $"Route option {normalIndex + 1} of {analyzedRoutes.Count}. {normalRoute.Message}";
                return normalRoute;
            }

            var safeRoutes = analyzedRoutes
                .Where(r => r.IsSafe)
                .ToList();

            if (safeRoutes.Any())
            {
                var safeIndex = Math.Abs(dto.RouteOptionIndex) % safeRoutes.Count;
                var safeRoute = safeRoutes[safeIndex];

                safeRoute.Message =
                    $"Safe route option {safeIndex + 1} of {safeRoutes.Count}.";

                return safeRoute;
            }

            var fallbackIndex = Math.Abs(dto.RouteOptionIndex) % analyzedRoutes.Count;
            var fallbackRoute = analyzedRoutes[fallbackIndex];

            fallbackRoute.Message =
                $"No fully safe route found. Showing alternative option {fallbackIndex + 1} of {analyzedRoutes.Count}.";

            return fallbackRoute;
        }

        private async Task<RealRouteResultDto> AnalyzeRouteAsync(
            GoogleRouteDto route,
            CancellationToken cancellationToken)
        {
            if (route == null ||
                route.Polyline == null ||
                string.IsNullOrWhiteSpace(route.Polyline.EncodedPolyline))
            {
                return new RealRouteResultDto
                {
                    IsSafe = false,
                    Message = "Returned route polyline is missing."
                };
            }

            var encodedPolyline = route.Polyline.EncodedPolyline;
            var decodedPoints = _polylineDecoderService.Decode(encodedPolyline);

            if (decodedPoints.Count < 2)
            {
                return new RealRouteResultDto
                {
                    IsSafe = false,
                    Message = "Returned route polyline is invalid."
                };
            }

            var geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

            var lineCoordinates = decodedPoints
                .Select(p => new Coordinate(p.Longitude, p.Latitude))
                .ToArray();

            var routeLine = geometryFactory.CreateLineString(lineCoordinates);

            var intersectingZones = await _context.DangerZones
                .AsNoTracking()
                .Where(z => z.Area != null && z.Area.Intersects(routeLine))
                .ToListAsync(cancellationToken);

            var activeReports = await _context.Reports
    .AsNoTracking()
    .Where(r => r.Status == "Verified" && r.Location != null)
    .ToListAsync(cancellationToken);

            const double alertDistanceMeters = 500;

            var nearbyReports = activeReports
                .Where(r =>
                {
                    var distanceMeters = GetMinimumDistanceToRouteInMeters(
                        decodedPoints,
                        r.Location.Y,
                        r.Location.X
                    );

                    return distanceMeters <= alertDistanceMeters;
                })
                .ToList();

            var isSafe = !intersectingZones.Any() && !nearbyReports.Any();

            return new RealRouteResultDto
            {
                IsSafe = isSafe,
                Message = isSafe
                    ? "Route is safe."
                    : "Route is unsafe because it intersects danger zones or passes near active reports.",
                DistanceMeters = route.DistanceMeters,
                Duration = route.Duration,
                EncodedPolyline = encodedPolyline,
                RoutePoints = decodedPoints,
                IntersectingZones = intersectingZones.Select(z => new ZoneAlertDto
                {
                    Id = z.Id,
                    Name = z.Name,
                    Level = z.Level
                }).ToList(),
                NearbyReports = nearbyReports.Select(r => new ReportAlertDto
                {
                    Id = r.Id,
                    Type = r.Type,
                    Description = r.Description,
                    Severity = r.Severity,
                    Status = r.Status,
                    Latitude = r.Location.Y,
                    Longitude = r.Location.X
                }).ToList()
            };
        }

        private static double GetMinimumDistanceToRouteInMeters(
            IList<RoutePointDto> routePoints,
            double pointLatitude,
            double pointLongitude)
        {
            if (routePoints == null || routePoints.Count == 0)
                return double.MaxValue;

            if (routePoints.Count == 1)
            {
                return GetDistanceInMeters(
                    pointLatitude,
                    pointLongitude,
                    routePoints[0].Latitude,
                    routePoints[0].Longitude
                );
            }

            double minDistance = double.MaxValue;

            for (int i = 0; i < routePoints.Count - 1; i++)
            {
                var start = routePoints[i];
                var end = routePoints[i + 1];

                var distance = DistancePointToSegmentMeters(
                    pointLatitude,
                    pointLongitude,
                    start.Latitude,
                    start.Longitude,
                    end.Latitude,
                    end.Longitude
                );

                if (distance < minDistance)
                    minDistance = distance;
            }

            return minDistance;
        }

        private static double DistancePointToSegmentMeters(
            double pointLat,
            double pointLng,
            double startLat,
            double startLng,
            double endLat,
            double endLng)
        {
            double refLatRad = DegreesToRadians(
                (pointLat + startLat + endLat) / 3.0
            );

            const double metersPerDegreeLat = 111320.0;
            double metersPerDegreeLng = 111320.0 * Math.Cos(refLatRad);

            double px = pointLng * metersPerDegreeLng;
            double py = pointLat * metersPerDegreeLat;

            double ax = startLng * metersPerDegreeLng;
            double ay = startLat * metersPerDegreeLat;

            double bx = endLng * metersPerDegreeLng;
            double by = endLat * metersPerDegreeLat;

            double abx = bx - ax;
            double aby = by - ay;
            double apx = px - ax;
            double apy = py - ay;

            double abLengthSquared = abx * abx + aby * aby;

            if (abLengthSquared == 0)
            {
                double dx = px - ax;
                double dy = py - ay;
                return Math.Sqrt(dx * dx + dy * dy);
            }

            double t = (apx * abx + apy * aby) / abLengthSquared;
            t = Math.Max(0, Math.Min(1, t));

            double closestX = ax + t * abx;
            double closestY = ay + t * aby;

            double diffX = px - closestX;
            double diffY = py - closestY;

            return Math.Sqrt(diffX * diffX + diffY * diffY);
        }

        private static double GetDistanceInMeters(
            double latitude1,
            double longitude1,
            double latitude2,
            double longitude2)
        {
            const double earthRadiusMeters = 6371000;

            double dLat = DegreesToRadians(latitude2 - latitude1);
            double dLon = DegreesToRadians(longitude2 - longitude1);

            double a =
                Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(DegreesToRadians(latitude1)) *
                Math.Cos(DegreesToRadians(latitude2)) *
                Math.Sin(dLon / 2) *
                Math.Sin(dLon / 2);

            double c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));

            return earthRadiusMeters * c;
        }

        private static double DegreesToRadians(double degrees)
        {
            return degrees * Math.PI / 180.0;
        }
    }
}