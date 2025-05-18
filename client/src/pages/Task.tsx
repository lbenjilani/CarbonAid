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
  <Paper elevation={3} sx={{ p: 2, height: '100%', flex: 1 }}>
    <Typography variant="h6" textAlign="center" mb={2}>
      {title}
    </Typography>
    <List>
      {sampleGoals.map((goal, i) => (
        <ListItem key={i}>
          <ListItemIcon>
            <Checkbox />
          </ListItemIcon>
          <ListItemText primary={goal} />
        </ListItem>
      ))}
    </List>
    <Box textAlign="center" mt={2}>
      <Button variant="outlined" size="small">
        Add a goal
      </Button>
    </Box>
  </Paper>
);

const Task: React.FC = () => {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#eaf5e1', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" textAlign="center" fontWeight="bold" gutterBottom>
          Your goals to mitigate your emissions
        </Typography>

        {/* Goals Columns */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 3,
            mt: 2,
            mb: 5,
          }}
        >
          <GoalColumn title="Daily goals" />
          <GoalColumn title="Monthly goals" />
          <GoalColumn title="Yearly goals" />
        </Box>

        {/* Suggested Goals Section */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 3,
            mt: 4,
          }}
        >
          {/* Suggested Daily Goals */}
          <Paper elevation={2} sx={{ flex: 1, p: 2, bgcolor: '#f1f8ec' }}>
            <Typography variant="subtitle1" textAlign="center" gutterBottom>
              Suggested Daily Goals
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {suggestedGoals.slice(0, 2).map((goal, index) => (
                <Button
                  key={`daily-${index}`}
                  variant="outlined"
                  sx={{ textTransform: 'none' }}
                  endIcon={<span style={{ fontWeight: 'bold', fontSize: '20px' }}>+</span>}
                >
                  {goal}
                </Button>
              ))}
            </Box>
          </Paper>

          {/* Suggested Monthly Goals */}
          <Paper elevation={2} sx={{ flex: 1, p: 2, bgcolor: '#f1f8ec' }}>
            <Typography variant="subtitle1" textAlign="center" gutterBottom>
              Suggested Monthly Goals
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {suggestedGoals.slice(2, 4).map((goal, index) => (
                <Button
                  key={`monthly-${index}`}
                  variant="outlined"
                  sx={{ textTransform: 'none' }}
                  endIcon={<span style={{ fontWeight: 'bold', fontSize: '20px' }}>+</span>}
                >
                  {goal}
                </Button>
              ))}
            </Box>
          </Paper>

          {/* Suggested Yearly Goals */}
          <Paper elevation={2} sx={{ flex: 1, p: 2, bgcolor: '#f1f8ec' }}>
            <Typography variant="subtitle1" textAlign="center" gutterBottom>
              Suggested Yearly Goals
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {suggestedGoals.slice(4).map((goal, index) => (
                <Button
                  key={`yearly-${index}`}
                  variant="outlined"
                  sx={{ textTransform: 'none' }}
                  endIcon={<span style={{ fontWeight: 'bold', fontSize: '20px' }}>+</span>}
                >
                  {goal}
                </Button>
              ))}
            </Box>
          </Paper>
        </Box>
      </Container>
      <Footer />
    </Box>
  );
};

export default Task;
