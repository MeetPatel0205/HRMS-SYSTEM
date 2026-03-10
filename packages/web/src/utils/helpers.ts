export const getInitials = (firstName: string, lastName: string): string => {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
};

export const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'approved':
      return '#4caf50';
    case 'pending':
      return '#ff9800';
    case 'rejected':
      return '#f44336';
    case 'active':
      return '#4caf50';
    case 'inactive':
      return '#9e9e9e';
    default:
      return '#2196f3';
  }
};

export const truncateText = (text: string, length: number): string => {
  return text.length > length ? `${text.substring(0, length)}...` : text;
};
