export function formatEventDate(datetime) {
  if (!datetime) return '';

  const date = new Date(datetime);
  const options = {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };

  return date.toLocaleString('en-US', options);
}

export function formatDateOnly(datetime) {
  if (!datetime) return '';

  const date = new Date(datetime);
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };

  return date.toLocaleDateString('en-US', options);
}

export function formatTimeOnly(datetime) {
  if (!datetime) return '';

  const date = new Date(datetime);
  const options = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };

  return date.toLocaleTimeString('en-US', options);
}
