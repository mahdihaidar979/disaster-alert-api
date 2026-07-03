using DisasterSystem.API.Data;
using DisasterSystem.API.DTOs;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;

namespace DisasterSystem.API.Services
{
    public class RouteSafetyService
    {
        private readonly ApplicationDbContext _context;

        public RouteSafetyService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<RouteSafetyResultDto> CheckSimpleRouteSafety(RouteRequestDto dto)
        {
            var geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

            var routeLine = geometryFactory.CreateLineString(new[]
            {
                new Coordinate(dto.StartLongitude, dto.StartLatitude),
                new Coordinate(dto.EndLongitude, dto.EndLatitude)
            });

            var intersectingZones = await _context.DangerZones
                .AsNoTracking()
                .Where(z => z.Area.Intersects(routeLine))
                .ToListAsync();

            var nearbyReports = await _context.Reports
                .AsNoTracking()
                .Where(r =>
                    r.Status != "Resolved" &&
                    r.Location.IsWithinDistance(routeLine, 500))
                .ToListAsync();

            var result = new RouteSafetyResultDto();

            result.IntersectingZones = intersectingZones.Select(z => new
            {
                z.Id,
                z.Name,
                z.Level
            }).Cast<object>().ToList();

            result.NearbyReports = nearbyReports.Select(r => new
            {
                r.Id,
                r.Type,
                r.Description,
                r.Severity,
                r.Status,
                Latitude = r.Location.Y,
                Longitude = r.Location.X
            }).Cast<object>().ToList();

            result.IsSafe = !result.IntersectingZones.Any() && !result.NearbyReports.Any();

            result.Message = result.IsSafe
                ? "Route is safe."
                : "Route is unsafe because it intersects danger zones or passes near active reports.";

            return result;
        }
    }
}