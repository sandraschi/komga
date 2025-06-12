import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Slider,
} from '@mui/material';
import { DebateSettings } from '../types';

interface DebateSettingsDialogProps {
  open: boolean;
  settings: DebateSettings;
  onClose: () => void;
  onSave: (settings: DebateSettings) => void;
}

const DebateSettingsDialog: React.FC<DebateSettingsDialogProps> = ({
  open,
  settings,
  onClose,
  onSave,
}) => {
  const [localSettings, setLocalSettings] = useState<DebateSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = (field: keyof DebateSettings, value: any) => {
    setLocalSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Debate Settings</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <Typography id="turn-duration-slider" gutterBottom>
              Turn Duration: {localSettings.turnDuration} seconds
            </Typography>
            <Slider
              value={localSettings.turnDuration}
              onChange={(_, value) =>
                handleChange('turnDuration', value as number)
              }
              aria-labelledby="turn-duration-slider"
              valueLabelDisplay="auto"
              step={5}
              marks
              min={15}
              max={180}
            />
          </FormControl>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <TextField
              label="Maximum Turns"
              type="number"
              value={localSettings.maxTurns}
              onChange={(e) =>
                handleChange('maxTurns', parseInt(e.target.value, 10))
              }
              inputProps={{ min: 1, max: 50 }}
              fullWidth
            />
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={localSettings.allowInterruptions}
                onChange={(e) =>
                  handleChange('allowInterruptions', e.target.checked)
                }
              />
            }
            label="Allow Interruptions"
            sx={{ mb: 2 }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DebateSettingsDialog;
