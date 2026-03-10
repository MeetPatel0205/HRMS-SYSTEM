import React from 'react';
import {
    Paper,
    Typography,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Checkbox,
    Box,
    LinearProgress,
    Chip
} from '@mui/material';
import { OnboardingChecklist, OnboardingTask } from '../../types/onboarding';
import { onboardingService } from '../../services/api/onboarding';
import { format } from 'date-fns';

interface OnboardingChecklistViewProps {
    checklist: OnboardingChecklist;
    onUpdate: () => void;
    readOnly?: boolean;
}

export const OnboardingChecklistView: React.FC<OnboardingChecklistViewProps> = ({ checklist, onUpdate, readOnly = false }) => {
    // Calculate progress
    const totalTasks = checklist.tasks.length;
    const completedTasks = checklist.tasks.filter(t => t.status === 'completed').length;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const handleToggle = async (task: OnboardingTask) => {
        if (readOnly) return;
        const newStatus = task.status === 'completed' ? 'pending' : 'completed';
        try {
            await onboardingService.updateTaskStatus(checklist.id, task.id, newStatus);
            onUpdate();
        } catch (err) {
            console.error(err);
            alert('Failed to update task');
        }
    };

    return (
        <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">Onboarding Checklist</Typography>
                <Chip
                    label={checklist.status === 'completed' ? 'Completed' : 'In Progress'}
                    color={checklist.status === 'completed' ? 'success' : 'primary'}
                />
            </Box>

            <Typography variant="body2" color="textSecondary" gutterBottom>
                Due: {format(new Date(checklist.dueDate), 'MMM d, yyyy')}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Box sx={{ width: '100%', mr: 1 }}>
                    <LinearProgress variant="determinate" value={progress} />
                </Box>
                <Box sx={{ minWidth: 35 }}>
                    <Typography variant="body2" color="textSecondary">{Math.round(progress)}%</Typography>
                </Box>
            </Box>

            <List>
                {checklist.tasks.map((task) => (
                    <ListItem key={task.id} dense button onClick={() => handleToggle(task)} disabled={readOnly}>
                        <ListItemIcon>
                            <Checkbox
                                edge="start"
                                checked={task.status === 'completed'}
                                tabIndex={-1}
                                disableRipple
                            />
                        </ListItemIcon>
                        <ListItemText
                            primary={task.title}
                            secondary={task.description}
                            sx={{
                                textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                                color: task.status === 'completed' ? 'text.secondary' : 'text.primary'
                            }}
                        />
                    </ListItem>
                ))}
            </List>
        </Paper>
    );
};
