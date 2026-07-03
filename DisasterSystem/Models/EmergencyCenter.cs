using NetTopologySuite.Geometries;

namespace DisasterSystem.API.Models
{
    public class EmergencyCenter
    {
        public int Id { get; set; }

        public string Name { get; set; } = string.Empty;

        // Hospital, FireDepartment, Police, CivilDefense, Shelter
        public string Type { get; set; } = string.Empty;

        public string Phone { get; set; } = string.Empty;

        public string Address { get; set; } = string.Empty;

        public bool IsAvailable { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Point Location { get; set; } = default!;
    }
}