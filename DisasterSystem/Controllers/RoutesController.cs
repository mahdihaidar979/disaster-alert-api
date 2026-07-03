using DisasterSystem.API.DTOs;
using DisasterSystem.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DisasterSystem.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class RoutesController : ControllerBase
    {
        private readonly RealRouteSafetyService _realRouteSafetyService;

        public RoutesController(RealRouteSafetyService realRouteSafetyService)
        {
            _realRouteSafetyService = realRouteSafetyService;
        }

        [HttpPost("real-safe-route")]
        public async Task<IActionResult> GetRealSafeRoute(
            [FromBody] RealRouteRequestDto dto,
            CancellationToken cancellationToken)
        {
            try
            {
                var result = await _realRouteSafetyService.GetSafeRouteAnalysisAsync(
                    dto,
                    cancellationToken
                );

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = ex.Message,
                    inner = ex.InnerException?.Message
                });
            }
        }

        [HttpPost("check-route")]
        public async Task<IActionResult> CheckNormalRoute(
            [FromBody] RealRouteRequestDto dto,
            CancellationToken cancellationToken)
        {
            try
            {
                dto.SafeMode = false;

                var result = await _realRouteSafetyService.GetSafeRouteAnalysisAsync(
                    dto,
                    cancellationToken
                );

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = ex.Message,
                    inner = ex.InnerException?.Message
                });
            }
        }

        [HttpPost("safe-route")]
        public async Task<IActionResult> GetAlternativeSafeRoute(
            [FromBody] RealRouteRequestDto dto,
            CancellationToken cancellationToken)
        {
            try
            {
                dto.SafeMode = true;

                var result = await _realRouteSafetyService.GetSafeRouteAnalysisAsync(
                    dto,
                    cancellationToken
                );

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = ex.Message,
                    inner = ex.InnerException?.Message
                });
            }
        }
    }
}