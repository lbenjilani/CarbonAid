// src/pages/Profile.tsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CssBaseline,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { loadProfile, saveProfile } from '../utils/profile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const Profile: React.FC = () => {
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const p = loadProfile();
    setName(p.name);
  }, []);

  const onSave = () => {
    saveProfile({ name });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: '#eaf5e1', display: 'flex', flexDirection: 'column' }}>
        <Header />
        <Box sx={{ flex: 1, maxWidth: 800, width: '100%', mx: 'auto', p: 3 }}>
          <Typography variant="h4" fontWeight={900} gutterBottom sx={{ color: '#1c6b34' }}>
            Your Profile
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Update how we greet you across the app. This is stored locally in your browser.
          </Typography>

          <Card sx={{ borderRadius: 3, border: '1px solid rgba(117,183,141,0.35)', background: '#f3faef' }}>
            <CardContent>
              <Stack spacing={2}>
                <TextField
                  label="Preferred name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  inputProps={{ maxLength: 40 }}
                  fullWidth
                />
                <Stack direction="row" gap={1} alignItems="center">
                  <Button variant="contained" color="success" onClick={onSave}>
                    Save
                  </Button>
                  {saved && (
                    <Chip
                      color="success"
                      icon={<CheckCircleIcon />}
                      label="Saved"
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Box>
        <Footer />
      </Box>
    </>
  );
};

export default Profile;
