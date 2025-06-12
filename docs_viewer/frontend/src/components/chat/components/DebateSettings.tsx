import React from 'react';
import {
  Box,
  Typography,
  Divider,
  TextField,
  Switch,
  FormControlLabel,
  Slider,
  Paper,
  useTheme,
  Grid,
  InputAdornment,
  Button,
} from '@mui/material';
import { DebateSettings } from '../types';

interface DebateSettingsProps {
  settings: DebateSettings;
  onSettingsChange: (newSettings: DebateSettings) => void;
  onSave?: () => void;
  onCancel?: () => void;
  onResetToDefaults?: () => void;
}

export const DebateSettings: React.FC<DebateSettingsProps> = ({
  settings = {
    turnDuration: 60,
    maxTurns: 10,
    allowInterruptions: true,
  },
  onSettingsChange,
  onSave,
  onCancel,
  onResetToDefaults,
}) => {
  const theme = useTheme();

  const handleNumberChange = (field: keyof DebateSettings) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      onSettingsChange({
        ...settings,
        [field]: value,
      });
    }
  };

  const handleSliderChange = (field: keyof DebateSettings) => (
    _: Event,
    value: number | number[]
  ) => {
    if (typeof value === 'number') {
      onSettingsChange({
        ...settings,
        [field]: value,
      });
    }
  };

  const handleSwitchChange = (field: keyof DebateSettings) => (
    _: React.ChangeEvent<HTMLInputElement>,
    checked: boolean
  ) => {
    onSettingsChange({
      ...settings,
      [field]: checked,
    });
  };

  return (
    <Box sx={{ p: 2, maxWidth: 600, margin: '0 auto' }}>
      <Typography variant="h6" gutterBottom>
        Debate Settings
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Box component="form" noValidate autoComplete="off">
        <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
          <Typography variant="subtitle1" gutterBottom>
            Turn Settings
          </Typography>
          
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} sm={6}>
              <Typography id="turn-duration-slider" gutterBottom>
                Turn Duration: {settings.turnDuration} seconds
              </Typography>
              <Slider
                value={settings.turnDuration}
                onChange={handleSliderChange('turnDuration')}
                aria-labelledby="turn-duration-slider"
                valueLabelDisplay="auto"
                step={5}
                marks
                min={10}
                max={180}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Turn Duration (seconds)"
                value={settings.turnDuration}
                onChange={handleNumberChange('turnDuration')}
                InputProps={{
                  endAdornment: <InputAdornment position="end">sec</InputAdornment>,
                }}
                inputProps={{
                  min: 10,
                  max: 180,
                  step: 5,
                }}
              />
            </Grid>
          </Grid>

          <Grid container spacing={3} alignItems="center" sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <Typography id="max-turns-slider" gutterBottom>
                Maximum Turns: {settings.maxTurns}
              </Typography>
              <Slider
                value={settings.maxTurns}
                onChange={handleSliderChange('maxTurns')}
                aria-labelledby="max-turns-slider"
                valueLabelDisplay="auto"
                step={1}
                marks
                min={1}
                max={20}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Maximum Turns"
                value={settings.maxTurns}
                onChange={handleNumberChange('maxTurns')}
                inputProps={{
                  min: 1,
                  max: 20,
                  step: 1,
                }}
              />
            </Grid>
          </Grid>
        </Paper>


        <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
          <Typography variant="subtitle1" gutterBottom>
            Interaction Settings
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={settings.allowInterruptions}
                onChange={handleSwitchChange('allowInterruptions')}
                color="primary"
              />
            }
            label="Allow participants to interrupt each other"
            sx={{ mb: 1 }}
          />
          
          <Typography variant="body2" color="textSecondary" paragraph>
            When enabled, participants can interrupt each other when they have something important to add.
          </Typography>

          <FormControlLabel
            control={<Switch color="primary" disabled />}
            label="Enable live audience reactions"
            sx={{ mb: 1 }}
          />
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Coming soon: Allow audience members to react with emojis during the debate.
          </Typography>
        </Paper>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={onResetToDefaults}
            disabled={!onResetToDefaults}
          >
            Reset to Defaults
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={onCancel}
              disabled={!onCancel}
              sx={{ mr: 1 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={onSave}
              disabled={!onSave}
            >
              Save Settings
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default DebateSettings;
