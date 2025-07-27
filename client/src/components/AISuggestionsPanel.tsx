// AISuggestionsPanel.tsx
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Divider,
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';

const AISuggestionsPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/suggestions');
      const data = await res.json();
      setSuggestions(data.tips || []);
    } catch (err) {
      setSuggestions(['⚠️ Failed to load suggestions.']);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      sx={{
        bgcolor: '#101820',
        color: 'white',
        borderRadius: 3,
        boxShadow: 4,
        minHeight: 300,
        p: 2,
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <SmartToyIcon color="success" />
          <Typography variant="h6" fontWeight="bold">
            AI Suggestions
          </Typography>
        </Box>

        <Typography variant="body2" sx={{ mb: 2, color: '#cfd8dc' }}>
          Get personalized emission-reduction strategies based on national trends.
        </Typography>

        <Button
          onClick={handleGenerate}
          variant="contained"
          fullWidth
          disabled={loading}
          sx={{ mb: 2, bgcolor: '#00e676', '&:hover': { bgcolor: '#00c853' } }}
        >
          {loading ? 'Generating...' : 'Generate Suggestions'}
        </Button>

        <Divider sx={{ bgcolor: '#37474f', my: 1 }} />

        {loading ? (
          <Box textAlign="center" mt={3}>
            <CircularProgress color="success" />
          </Box>
        ) : (
          <Box component="ul" sx={{ pl: 2, mb: 0 }}>
            {suggestions.map((tip, index) => (
              <li key={index}>
                <Typography variant="body2" color="#e0f2f1">
                  {tip}
                </Typography>
              </li>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default AISuggestionsPanel;
