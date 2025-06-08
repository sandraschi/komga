# Home Automation Projects

This directory contains documentation for home automation and IoT projects in the CascadeProjects folder.

## Table of Contents
- [Active Projects](#active-projects)
- [Device Integration](#device-integration)
- [Automation Rules](#automation-rules)
- [Security](#security)
- [Development Setup](#development-setup)
- [Troubleshooting](#troubleshooting)

## Active Projects

### People-inator
- **Status**: Active Development
- **Purpose**: Person/device presence detection
- **Features**:
  - Multi-room presence detection
  - Device tracking
  - Activity logging
- **Tech Stack**:
  - Backend: Node.js
  - Database: InfluxDB
  - Frontend: React

### MediaDashboards
- **Status**: In Development
- **Purpose**: Unified media control
- **Features**:
  - Centralized media control
  - Cross-platform support
  - Customizable dashboards
- **Integrations**:
  - Plex
  - Jellyfin
  - Spotify
  - YouTube

### Doofenshmirtz-Evil-Inators
- **Status**: Experimental
- **Purpose**: Fun automation scripts
- **Example Scripts**:
  - Automatic lighting scenes
  - Voice-controlled appliances
  - Scheduled routines

## Device Integration

### Supported Devices
| Device Type | Brand/Model | Integration Method | Status |
|-------------|-------------|-------------------|--------|
| Smart Bulbs | Philips Hue | Zigbee | ✅ |
| Thermostat | Nest | Cloud API | ✅ |
| Smart Plug | TP-Link | Local API | ✅ |
| Security Cam | Reolink | RTSP | 🚧 |
| Robot Vacuum | Roborock | Cloud API | ❌ |

### Integration Patterns
1. **Local Control**
   - Direct device communication
   - No cloud dependency
   - Faster response times

2. **Cloud Integration**
   - Remote access
   - Manufacturer features
   - Potential latency

3. **Hybrid Approach**
   - Local control with cloud backup
   - Best of both worlds
   - More complex setup

## Automation Rules

### Example Rules
```yaml
# lights.yaml
- name: "Evening Lighting"
  trigger:
    platform: time
    at: "sunset - 00:30:00"
  action:
    service: light.turn_on
    entity_id: light.living_room
    brightness_pct: 75
    kelvin: 2700

# presence.yaml
- name: "Away Mode"
  trigger:
    platform: state
    entity_id: device_tracker.person1
    to: "not_home"
  condition:
    condition: and
    conditions:
      - condition: state
        entity_id: device_tracker.person2
        state: "not_home"
  action:
    - service: alarm_control_panel.alarm_arm_away
      target:
        entity_id: alarm_control_panel.home
```

## Security

### Best Practices
1. **Network Security**
   - Use VLANs for IoT devices
   - Enable firewall rules
   - Regular firmware updates

2. **Access Control**
   - Strong passwords
   - Two-factor authentication
   - Role-based access

3. **Data Privacy**
   - Local storage where possible
   - Data encryption
   - Regular audits

## Development Setup

### Prerequisites
- Docker
- Node.js 16+
- Python 3.8+
- Mosquitto MQTT broker

### Installation
```bash
# Clone the repository
git clone [repo-url]

# Install dependencies
npm install

# Start development environment
docker-compose up -d
```

### Configuration
1. Copy `.env.example` to `.env`
2. Update configuration values
3. Set up device credentials

## Troubleshooting

### Common Issues
1. **Device Unreachable**
   - Check network connection
   - Verify power supply
   - Restart device

2. **Automation Not Triggering**
   - Check trigger conditions
   - Verify entity states
   - Review logs

3. **Performance Issues**
   - Check system resources
   - Optimize automation rules
   - Reduce polling frequency

### Logs
```bash
# View logs
docker-compose logs -f

# Debug mode
DEBUG=* npm start
```

## Future Enhancements
1. **Machine Learning**
   - Predictive automation
   - Anomaly detection
   - Energy optimization

2. **Voice Control**
   - Local voice processing
   - Custom wake words
   - Multi-language support

3. **Energy Monitoring**
   - Real-time usage tracking
   - Cost analysis
   - Efficiency recommendations
