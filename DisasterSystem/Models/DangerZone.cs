using NetTopologySuite.Geometries;

namespace DisasterSystem.API.Models
{
    public class DangerZone
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public Polygon Area { get; set; } = default!;
        public int Level { get; set; }
    }
}