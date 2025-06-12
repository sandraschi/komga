import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  IconButton,
  Tooltip,
  Divider,
  Box,
  Typography,
  Tabs,
  Tab,
  Badge,
  Chip,
  useTheme,
} from '@mui/material';
import {
  Person as PersonIcon,
  SmartToy as AIIcon,
  Add as AddIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Check as CheckIcon,
  Psychology as PsychologyIcon,
  EmojiPeople as FutureSelfIcon,
  Groups as TeamsIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
} from '@mui/icons-material';
import { AIPersona } from '../../types/chat';

interface ChatPersonalitySelectorProps {
  open: boolean;
  onClose: () => void;
  onSelectPersona: (persona: AIPersona) => void;
  selectedPersonaId?: string;
}

const defaultPersonas: AIPersona[] = [
  {
    id: 'assistant',
    name: 'AI Assistant',
    description: 'Helpful and friendly AI assistant',
    systemPrompt: 'You are a helpful AI assistant that provides useful and accurate information.',
    temperature: 0.7,
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'debater',
    name: 'Debate Pro',
    description: 'Challenges ideas and presents counterarguments',
    systemPrompt: 'You are a debate expert who challenges ideas and presents well-reasoned counterarguments.',
    temperature: 0.8,
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'future-self',
    name: 'Future Self',
    description: 'Your wiser future self with insights',
    systemPrompt: 'You are the user\'s future self, offering wisdom and perspective from further along their journey.',
    temperature: 0.6,
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'teammate',
    name: 'Team Member',
    description: 'Collaborative team participant',
    systemPrompt: 'You are a helpful team member who collaborates effectively with others.',
    temperature: 0.7,
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const ChatPersonalitySelector: React.FC<ChatPersonalitySelectorProps> = ({
  open,
  onClose,
  onSelectPersona,
  selectedPersonaId,
}) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [personas, setPersonas] = useState<AIPersona[]>([]);
  const [filteredPersonas, setFilteredPersonas] = useState<AIPersona[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [isEditing, setIsEditing] = useState<AIPersona | null>(null);
  const [editForm, setEditForm] = useState<Partial<AIPersona>>({
    name: '',
    description: '',
    systemPrompt: '',
    temperature: 0.7,
  });

  // Initialize with default personas
  useEffect(() => {
    const savedPersonas = localStorage.getItem('customPersonas');
    const customPersonas = savedPersonas ? JSON.parse(savedPersonas) : [];
    setPersonas([...defaultPersonas, ...customPersonas]);
  }, []);

  // Filter personas based on search and active tab
  useEffect(() => {
    let result = [...personas];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.systemPrompt.toLowerCase().includes(query)
      );
    }

    // Apply tab filter
    if (activeTab === 'default') {
      result = result.filter((p) => p.isDefault);
    } else if (activeTab === 'custom') {
      result = result.filter((p) => !p.isDefault);
    }

    setFilteredPersonas(result);
  }, [searchQuery, personas, activeTab]);

  const handleSavePersona = () => {
    if (!isEditing) return;

    const updatedPersonas = [...personas];
    const index = updatedPersonas.findIndex((p) => p.id === isEditing.id);
    
    if (index >= 0) {
      // Update existing persona
      updatedPersonas[index] = { ...isEditing, ...editForm } as AIPersona;
    } else {
      // Add new persona
      const newPersona: AIPersona = {
        ...(editForm as Omit<AIPersona, 'id' | 'createdAt' | 'updatedAt'>),
        id: `custom-${Date.now()}`,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      updatedPersonas.push(newPersona);
      
      // Save to localStorage
      const customPersonas = updatedPersonas.filter((p) => !p.isDefault);
      localStorage.setItem('customPersonas', JSON.stringify(customPersonas));
    }

    setPersonas(updatedPersonas);
    setIsEditing(null);
    setEditForm({ name: '', description: '', systemPrompt: '', temperature: 0.7 });
  };

  const handleDeletePersona = (persona: AIPersona) => {
    if (persona.isDefault) return; // Prevent deleting default personas
    
    const updatedPersonas = personas.filter((p) => p.id !== persona.id);
    setPersonas(updatedPersonas);
    
    // Update localStorage
    const customPersonas = updatedPersonas.filter((p) => !p.isDefault);
    localStorage.setItem('customPersonas', JSON.stringify(customPersonas));
  };

  const handleEditPersona = (persona: AIPersona) => {
    setEditForm({
      name: persona.name,
      description: persona.description,
      systemPrompt: persona.systemPrompt,
      temperature: persona.temperature,
    });
    setIsEditing(persona);
  };

  const handleCreateNew = () => {
    setEditForm({
      name: '',
      description: '',
      systemPrompt: '',
      temperature: 0.7,
    });
    setIsEditing({
      id: '',
      name: '',
      description: '',
      systemPrompt: '',
      temperature: 0.7,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  const getPersonaIcon = (persona: AIPersona) => {
    if (persona.id.includes('future')) return <FutureSelfIcon />;
    if (persona.id.includes('debate') || persona.id.includes('pro')) return <PsychologyIcon />;
    if (persona.id.includes('team')) return <TeamsIcon />;
    return <AIIcon />;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center">
            <AIIcon sx={{ mr: 1 }} />
            <Typography variant="h6">AI Personalities</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {isEditing ? (
          <Box>
            <TextField
              fullWidth
              label="Name"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Description"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              margin="normal"
              multiline
              rows={2}
            />
            <TextField
              fullWidth
              label="System Prompt"
              value={editForm.systemPrompt}
              onChange={(e) => setEditForm({ ...editForm, systemPrompt: e.target.value })}
              margin="normal"
              multiline
              rows={4}
              required
            />
            <Box mt={2} mb={2}>
              <Typography gutterBottom>Temperature: {editForm.temperature?.toFixed(1)}</Typography>
              <Slider
                value={editForm.temperature || 0.7}
                onChange={(_, value) => setEditForm({ ...editForm, temperature: value as number })}
                min={0}
                max={1}
                step={0.1}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => value.toFixed(1)}
              />
              <Box display="flex" justifyContent="space-between" mt={-1}>
                <Typography variant="caption">Precise</Typography>
                <Typography variant="caption">Creative</Typography>
              </Box>
            </Box>
          </Box>
        ) : (
          <>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search personalities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
                endAdornment: searchQuery && (
                  <IconButton size="small" onClick={() => setSearchQuery('')}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                ),
              }}
              margin="dense"
            />
            
            <Tabs
              value={activeTab}
              onChange={(_, value) => setActiveTab(value)}
              sx={{ mb: 2 }}
              variant="fullWidth"
            >
              <Tab label="All" value="all" />
              <Tab label="Default" value="default" />
              <Tab label="Custom" value="custom" />
            </Tabs>
            
            <List sx={{ maxHeight: 400, overflow: 'auto' }}>
              {filteredPersonas.map((persona) => (
                <React.Fragment key={persona.id}>
                  <ListItem
                    secondaryAction={
                      <Box>
                        {!persona.isDefault && (
                          <>
                            <IconButton
                              edge="end"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditPersona(persona);
                              }}
                              size="small"
                              sx={{ mr: 1 }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              edge="end"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePersona(persona);
                              }}
                              size="small"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </>
                        )}
                      </Box>
                    }
                    onClick={() => onSelectPersona(persona)}
                    sx={{
                      borderRadius: 1,
                      mb: 1,
                      bgcolor: selectedPersonaId === persona.id ? 'action.selected' : 'background.paper',
                      '&:hover': {
                        bgcolor: 'action.hover',
                        cursor: 'pointer',
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.light' }}>
                        {getPersonaIcon(persona)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center">
                          {persona.name}
                          {persona.isDefault && (
                            <Chip
                              label="Default"
                              size="small"
                              sx={{ ml: 1, height: 18, fontSize: '0.65rem' }}
                            />
                          )}
                        </Box>
                      }
                      secondary={persona.description}
                      secondaryTypographyProps={{ noWrap: true }}
                    />
                    {selectedPersonaId === persona.id && (
                      <Box ml={2}>
                        <CheckIcon color="primary" />
                      </Box>
                    )}
                  </ListItem>
                  <Divider variant="inset" component="li" />
                </React.Fragment>
              ))}
              
              {filteredPersonas.length === 0 && (
                <Box textAlign="center" py={4}>
                  <Typography variant="body2" color="textSecondary">
                    No personas found. Try a different search or create a new one.
                  </Typography>
                </Box>
              )}
            </List>
          </>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        {isEditing ? (
          <>
            <Button onClick={() => setIsEditing(null)} color="inherit">
              Cancel
            </Button>
            <Button
              onClick={handleSavePersona}
              variant="contained"
              disabled={!editForm.name || !editForm.systemPrompt}
            >
              Save
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onClose} color="inherit">
              Cancel
            </Button>
            <Button
              onClick={handleCreateNew}
              variant="outlined"
              startIcon={<AddIcon />}
            >
              New Personality
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ChatPersonalitySelector;
