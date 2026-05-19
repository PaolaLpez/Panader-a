// Formatear fechas
const formatDate = (date, format = 'es-MX') => {
  return new Date(date).toLocaleDateString(format, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatTime = (date) => {
  return new Date(date).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Formatear moneda
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(amount);
};

// Calcular edad
const calcularEdad = (fechaNacimiento) => {
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  
  return edad;
};

// Generar folio único
const generarFolio = (prefix = 'V') => {
  const fecha = new Date();
  const timestamp = fecha.getTime();
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `${prefix}-${fecha.getFullYear()}${(fecha.getMonth()+1).toString().padStart(2, '0')}${fecha.getDate().toString().padStart(2, '0')}-${random}`;
};

// Validar hora de turno
const validarHoraTurno = (tipoTurno) => {
  const ahora = new Date();
  const hora = ahora.getHours();
  
  if (tipoTurno === 'mañana') {
    return hora >= 7 && hora < 11;
  } else if (tipoTurno === 'noche') {
    return hora >= 18 && hora < 22;
  }
  
  return false;
};

module.exports = {
  formatDate,
  formatTime,
  formatCurrency,
  calcularEdad,
  generarFolio,
  validarHoraTurno
};