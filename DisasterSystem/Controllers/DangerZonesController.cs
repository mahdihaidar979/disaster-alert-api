using DisasterSystem.API.Data;
using DisasterSystem.API.DTOs;
using DisasterSystem.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;

namespace DisasterSystem.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DangerZonesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public DangerZonesController(ApplicationDbContext context)
        {
            _context = context;
        }

        // 🔴 Admin فقط
        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<IActionResult> CreateZone(CreateDangerZoneDto dto)
        {
            if (dto.Coordinates.Count < 3)
                return BadRequest("Polygon must have at least 3 points.");

            var geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

            var coords = dto.Coordinates
                .Select(c => new Coordinate(c.Longitude, c.Latitude))
                .ToList();

            // close polygon (first = last)
            coords.Add(coords[0]);

            var polygon = geometryFactory.CreatePolygon(coords.ToArray());

            var zone = new DangerZone
            {
                Name = dto.Name,
                Level = dto.Level,
                Area = polygon
            };

            _context.DangerZones.Add(zone);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Danger zone created"
            });
        }

        // 🟢 عام
        [AllowAnonymous]
        [HttpGet]
        public async Task<IActionResult> GetAllZones()
        {
            var zones = await _context.DangerZones
                .AsNoTracking()
                .ToListAsync();

            var result = zones.Select(z => new
            {
                z.Id,
                z.Name,
                z.Level,
                Coordinates = z.Area.Coordinates.Select(c => new
                {
                    Latitude = c.Y,
                    Longitude = c.X
                })
            });

            return Ok(result);
        }

        // 🔥 تحقق هل المستخدم داخل منطقة خطر
        [AllowAnonymous]
        [HttpGet("check")]
        public async Task<IActionResult> CheckLocation(
            [FromQuery] double latitude,
            [FromQuery] double longitude)
        {
            var point = new Point(longitude, latitude) { SRID = 4326 };

            var zones = await _context.DangerZones
                .Where(z => z.Area.Contains(point))
                .ToListAsync();

            return Ok(new
            {
                insideDangerZone = zones.Any(),
                zones = zones.Select(z => new
                {
                    z.Id,
                    z.Name,
                    z.Level
                })
            });
        }
    }
}