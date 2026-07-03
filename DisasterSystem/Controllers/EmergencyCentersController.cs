using DisasterSystem.API.Data;
using DisasterSystem.API.DTOs;
using DisasterSystem.API.Models;
using DisasterSystem.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;

namespace DisasterSystem.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EmergencyCentersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly GooglePlacesService _googlePlaces;

        public EmergencyCentersController(
            ApplicationDbContext context,
            GooglePlacesService googlePlaces)
        {
            _context = context;
            _googlePlaces = googlePlaces;
        }

        [AllowAnonymous]
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? type)
        {
            var query = _context.EmergencyCenters.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(type))
            {
                query = query.Where(c => c.Type == type);
            }

            var centers = await query
                .OrderBy(c => c.Name)
                .ToListAsync();

            return Ok(centers.Select(c => new
            {
                c.Id,
                c.Name,
                c.Type,
                c.Phone,
                c.Address,
                c.IsAvailable,
                c.CreatedAt,
                Latitude = c.Location.Coordinate.Y,
                Longitude = c.Location.Coordinate.X
            }));
        }

        [AllowAnonymous]
        [HttpGet("nearby")]
        public async Task<IActionResult> GetNearby(
            [FromQuery] double latitude,
            [FromQuery] double longitude,
            [FromQuery] double radiusInMeters = 5000,
            [FromQuery] string? type = null)
        {
            var centers = await _context.EmergencyCenters
                .AsNoTracking()
                .ToListAsync();

            if (!string.IsNullOrWhiteSpace(type))
            {
                centers = centers
                    .Where(c => c.Type == type)
                    .ToList();
            }

            var result = centers
                .Select(c => new
                {
                    Center = c,
                    Distance = GetDistanceInMeters(
                        latitude,
                        longitude,
                        c.Location.Coordinate.Y,
                        c.Location.Coordinate.X
                    )
                })
                .Where(x => x.Distance <= radiusInMeters)
                .OrderBy(x => x.Distance)
                .Select(x => new
                {
                    x.Center.Id,
                    x.Center.Name,
                    x.Center.Type,
                    x.Center.Phone,
                    x.Center.Address,
                    x.Center.IsAvailable,
                    x.Center.CreatedAt,
                    Latitude = x.Center.Location.Coordinate.Y,
                    Longitude = x.Center.Location.Coordinate.X,
                    DistanceMeters = x.Distance
                });

            return Ok(result);
        }

        [AllowAnonymous]
        [HttpGet("google")]
        public async Task<IActionResult> GetFromGoogle(
            [FromQuery] double latitude,
            [FromQuery] double longitude,
            [FromQuery] string type)
        {
            var data = await _googlePlaces.GetNearbyPlaces(
                latitude,
                longitude,
                type
            );

            return Ok(data);
        }

        [AllowAnonymous]
        [HttpGet("google/all-hospitals")]
        public async Task<IActionResult> GetAllHospitals()
        {
            var data = await _googlePlaces.GetAllHospitalsInLebanon();
            return Ok(data);
        }

        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<IActionResult> Create(CreateEmergencyCenterDto dto)
        {
            var allowedTypes = new[]
            {
                "Hospital",
                "FireDepartment",
                "Police",
                "CivilDefense",
                "Shelter"
            };

            if (!allowedTypes.Contains(dto.Type))
                return BadRequest("Invalid emergency center type.");

            var center = new EmergencyCenter
            {
                Name = dto.Name,
                Type = dto.Type,
                Phone = dto.Phone,
                Address = dto.Address,
                IsAvailable = dto.IsAvailable,
                CreatedAt = DateTime.UtcNow,
                Location = new Point(dto.Longitude, dto.Latitude)
                {
                    SRID = 4326
                }
            };

            _context.EmergencyCenters.Add(center);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Emergency center created successfully",
                center.Id
            });
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, CreateEmergencyCenterDto dto)
        {
            var center = await _context.EmergencyCenters.FindAsync(id);

            if (center == null)
                return NotFound("Emergency center not found.");

            center.Name = dto.Name;
            center.Type = dto.Type;
            center.Phone = dto.Phone;
            center.Address = dto.Address;
            center.IsAvailable = dto.IsAvailable;
            center.Location = new Point(dto.Longitude, dto.Latitude)
            {
                SRID = 4326
            };

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Emergency center updated successfully"
            });
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var center = await _context.EmergencyCenters.FindAsync(id);

            if (center == null)
                return NotFound("Emergency center not found.");

            _context.EmergencyCenters.Remove(center);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Emergency center deleted successfully"
            });
        }

        [AllowAnonymous]
        [HttpGet("google/all-police")]
        public async Task<IActionResult> GetAllPolice()
        {
            var data = await _googlePlaces.GetAllPoliceInLebanon();
            return Ok(data);
        }

        [AllowAnonymous]
        [HttpGet("google/all-fire")]
        public async Task<IActionResult> GetAllFireStations()
        {
            var data = await _googlePlaces.GetAllFireStationsInLebanon();
            return Ok(data);
        }

        [AllowAnonymous]
        [HttpGet("google/all")]
        public async Task<IActionResult> GetAllGoogleCenters([FromQuery] string type)
        {
            var data = type switch
            {
                "hospital" => await _googlePlaces.GetAllHospitalsInLebanon(),
                "police" => await _googlePlaces.GetAllPoliceInLebanon(),
                "fire_station" => await _googlePlaces.GetAllFireStationsInLebanon(),
                _ => await _googlePlaces.GetNearbyPlaces(33.8938, 35.5018, type)
            };

            return Ok(data);
        }
        private static double GetDistanceInMeters(
            double lat1,
            double lon1,
            double lat2,
            double lon2)
        {
            const double R = 6371000;

            double dLat = (lat2 - lat1) * Math.PI / 180;
            double dLon = (lon2 - lon1) * Math.PI / 180;

            double a =
                Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(lat1 * Math.PI / 180) *
                Math.Cos(lat2 * Math.PI / 180) *
                Math.Sin(dLon / 2) *
                Math.Sin(dLon / 2);

            double c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));

            return R * c;
        }
    }
}