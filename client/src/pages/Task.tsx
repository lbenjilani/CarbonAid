import React from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  Checkbox,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Stack,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import Header from '../components/Header';
import Footer from '../components/Footer';

const sampleGoals = [
  'Walk instead of drive',
  'Use reusable bags',
  'Turn off lights when not in use',
];

const suggestedGoals: string[] = [
  'Use public transport',
  'Eat less meat',
  'Unplug unused devices',
  'Plant a tree',
  'Compost food waste',
];

const GoalColumn = ({ title }: { title: string }) => (
  <Paper
    elevation={3}
    sx={{
      p: 3,
      flex: 1,
      bgcolor: '#dcedc8',
      borderRadius: 2,
      boxShadow: 2,
    }}
  >
    <Typography variant="h6" textAlign="center" mb={2} color="primary" fontWeight="bold">
      {title}
    </Typography>
    <List>
      {sampleGoals.map((goal, i) => (
        <ListItem key={i} disablePadding>
          <ListItemIcon>
            <Checkbox sx={{ color: '#66bb6a' }} />
          </ListItemIcon>
          <ListItemText primary={goal} />
        </ListItem>
      ))}
    </List>
    <Box textAlign="center" mt={2}>
      <Button variant="contained" color="success">
        Add a goal
      </Button>
    </Box>
  </Paper>
);

const Task: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#eaf5e1', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" textAlign="center" fontWeight="bold" gutterBottom>
          🌱 Your Goals to Mitigate Emissions
        </Typography>

        {/* Goals Columns */}
        <Stack direction={isMobile ? 'column' : 'row'} spacing={3} mt={4} mb={5}>
          <GoalColumn title="Daily Goals" />
          <GoalColumn title="Monthly Goals" />
          <GoalColumn title="Yearly Goals" />
        </Stack>

        {/* Suggested Goals Section */}
        <Stack direction={isMobile ? 'column' : 'row'} spacing={3}>
          {[
            { title: 'Suggested Daily Goals', items: suggestedGoals.slice(0, 2) },
            { title: 'Suggested Monthly Goals', items: suggestedGoals.slice(2, 4) },
            { title: 'Suggested Yearly Goals', items: suggestedGoals.slice(4) },
          ].map(({ title, items }, index) => (
            <Paper
              key={index}
              elevation={2}
              sx={{ flex: 1, p: 3, bgcolor: '#f0f8e0', borderLeft: '5px solid #81c784' }}
            >
              <Typography variant="subtitle1" textAlign="center" fontWeight="bold" gutterBottom>
                {title}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {items.map((goal, idx) => (
                  <Button
                    key={idx}
                    variant="outlined"
                    sx={{
                      textTransform: 'none',
                      borderColor: '#81c784',
                      color: '#388e3c',
                      fontWeight: 'bold',
                      '&:hover': { borderColor: '#66bb6a', bgcolor: '#e8f5e9' },
                    }}
                    endIcon={<span style={{ fontWeight: 'bold', fontSize: '20px' }}>+</span>}
                  >
                    {goal}
                  </Button>
                ))}
              </Box>
            </Paper>
          ))}
        </Stack>
      </Container>
      <Footer />
    </Box>
  );
};

export default Task;
