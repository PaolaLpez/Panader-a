const Stripe = require('stripe');

class StripeController {
  static async pay(req, res) {
    try {
      const { amount, currency = 'mxn' } = req.body;
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

      if (!stripeSecretKey) {
        return res.status(500).json({
          success: false,
          message: 'La clave secreta de Stripe no está configurada en el servidor.'
        });
      }

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'El monto del pago debe ser mayor a 0.'
        });
      }

      const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-08-16' });

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency,
        payment_method_types: ['card'],
        description: 'Pago de venta POS PanaPina',
      });

      res.status(200).json({
        success: true,
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency
      });
    } catch (error) {
      console.error('Error Stripe:', error);
      res.status(500).json({
        success: false,
        message: 'Error al procesar el pago con Stripe.',
        error: error.message
      });
    }
  }
}

module.exports = StripeController;
