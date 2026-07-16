var fs = require('fs');
var path = require('path');

var dataDir = path.join(__dirname, '..', 'data');
var emailLogFile = path.join(dataDir, 'email-log.json');
var resendClient = null;

function getResendClient() {
  if (resendClient) {
    return resendClient;
  }

  var apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    var Resend = require('resend');
    resendClient = new Resend(apiKey);
  } catch (error) {
    console.error('[Beautique Email] Resend client load failed:', error.message || error);
    return null;
  }

  return resendClient;
}

function sendWithResend(message) {
  var client = getResendClient();
  if (!client) {
    return Promise.resolve(null);
  }

  var fromAddress = process.env.EMAIL_FROM || 'Beautique <hello@lunabeauty.com>';
  return client.emails.send({
    from: fromAddress,
    to: message.to,
    subject: message.subject,
    text: message.body
  }).catch(function(err) {
    console.error('[Beautique Email] Resend send failed:', err);
  });
}

function ensureEmailLog() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  if (!fs.existsSync(emailLogFile)) {
    fs.writeFileSync(emailLogFile, JSON.stringify([], null, 2));
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getDomainVariant(email) {
  var domain = (email || '').toLowerCase();
  if (domain.indexOf('outlook') !== -1 || domain.indexOf('hotmail') !== -1 || domain.indexOf('live') !== -1) {
    return 'professional';
  }
  if (domain.indexOf('yahoo') !== -1) {
    return 'warm';
  }
  if (domain.indexOf('gmail') !== -1 || domain.indexOf('googlemail') !== -1) {
    return 'friendly';
  }
  return 'modern';
}

function buildEmail(type, email, data) {
  var variant = getDomainVariant(email);
  var firstName = data.firstName || 'there';
  var otp = data.otp || '';
  var orderNumber = data.orderNumber || 'ORD-' + Date.now().toString().slice(-6);
  var total = data.total || '0.00';

  if (type === 'otp') {
    var subject = 'Your Beautique OTP code';
    var body = 'Hello ' + firstName + ',\n\nYour one-time password is ' + otp + '. Use it now to complete your sign-in or verification.\n\nThis code is valid for a short time and will help keep your account secure.';

    if (variant === 'professional') {
      body = 'Hello ' + firstName + ',\n\nYour verification code is ' + otp + '. Please use it immediately to complete your request.\n\nThis keeps your Beautique account secure.';
    } else if (variant === 'warm') {
      body = 'Hi ' + firstName + ',\n\nYour quick verification code is ' + otp + '. Please enter it right away to continue.\n\nThanks for shopping with Beautique.';
    } else if (variant === 'friendly') {
      body = 'Hey ' + firstName + ',\n\nHere is your fast OTP: ' + otp + '. Enter it now to continue.\n\nEnjoy your Beautique experience!';
    }

    return { type: type, to: email, subject: subject, body: body, variant: variant };
  }

  if (type === 'order_confirmation') {
    var orderSubject = 'Your Beautique order is confirmed';
    var orderBody = 'Hello ' + firstName + ',\n\nYour order ' + orderNumber + ' has been confirmed. Total paid: $' + total + '.\n\nWe are preparing your items for delivery.';

    if (variant === 'professional') {
      orderBody = 'Hello ' + firstName + ',\n\nOrder ' + orderNumber + ' is confirmed. The total amount is $' + total + '.\n\nYour purchase is being processed promptly.';
    } else if (variant === 'warm') {
      orderBody = 'Hi ' + firstName + ',\n\nYour order ' + orderNumber + ' has been confirmed and we are getting it ready for you. Total: $' + total + '.\n\nThanks for choosing Beautique.';
    } else if (variant === 'friendly') {
      orderBody = 'Hey ' + firstName + ',\n\nYour order ' + orderNumber + ' is confirmed! Total: $' + total + '.\n\nWe are packing your favorites now.';
    }

    return { type: type, to: email, subject: orderSubject, body: orderBody, variant: variant };
  }

  if (type === 'follow_up') {
    var followSubject = 'A quick update from Beautique';
    var followBody = 'Hello ' + firstName + ',\n\nThanks for your order. We will keep you updated on its progress and share the next steps soon.';

    if (variant === 'professional') {
      followBody = 'Hello ' + firstName + ',\n\nThank you for your recent purchase. We will send the next update shortly regarding your order status.';
    } else if (variant === 'warm') {
      followBody = 'Hi ' + firstName + ',\n\nWe are so glad you chose Beautique. We will keep you posted with the latest updates on your order.';
    } else if (variant === 'friendly') {
      followBody = 'Hey ' + firstName + ',\n\nYour order is in good hands. We will send another update soon so you know what is happening next.';
    }

    return { type: type, to: email, subject: followSubject, body: followBody, variant: variant };
  }

  if (type === 'order_cancellation') {
    var cancelSubject = 'Your Beautique order has been cancelled';
    var cancelBody = 'Hello ' + firstName + ',\n\nOrder ' + orderNumber + ' has been cancelled. A refund for $' + total + ' will be processed shortly.\n\nIf you need anything else, reply to this email.';

    if (variant === 'professional') {
      cancelBody = 'Hello ' + firstName + ',\n\nOrder ' + orderNumber + ' has been cancelled. A refund of $' + total + ' will be issued soon.\n\nPlease reach out if you have any questions.';
    } else if (variant === 'warm') {
      cancelBody = 'Hi ' + firstName + ',\n\nYour order ' + orderNumber + ' has been cancelled. We will refund $' + total + ' as soon as possible.\n\nLet us know if you want help placing a new order.';
    } else if (variant === 'friendly') {
      cancelBody = 'Hey ' + firstName + ',\n\nYour order ' + orderNumber + ' has been cancelled, and we will refund $' + total + ' shortly.\n\nIf you want, we can help you choose something new.';
    }

    return { type: type, to: email, subject: cancelSubject, body: cancelBody, variant: variant };
  }

  if (type === 'review_notification') {
    var reviewSubject = 'New product review submitted';
    var reviewBody = 'Hello ' + firstName + ',\n\nA new review has been submitted for ' + data.productName + '.\n\nReviewer: ' + data.reviewerName + '\nRating: ' + data.rating + '/5\nComment: ' + (data.comment || 'No comment provided.') + '\n\nCheck the admin dashboard to review it.';

    if (variant === 'professional') {
      reviewBody = 'Hello ' + firstName + ',\n\nA new review has been submitted for ' + data.productName + '.\n\nReviewer: ' + data.reviewerName + '\nRating: ' + data.rating + '/5\nComment: ' + (data.comment || 'No comment provided.') + '\n\nPlease review this submission in the admin portal.';
    } else if (variant === 'warm') {
      reviewBody = 'Hi ' + firstName + ',\n\nThere is a new review for ' + data.productName + '.\n\nReviewer: ' + data.reviewerName + '\nRating: ' + data.rating + '/5\nComment: ' + (data.comment || 'No comment provided.') + '\n\nTake a look in the admin dashboard when you can.';
    } else if (variant === 'friendly') {
      reviewBody = 'Hey ' + firstName + ',\n\nA customer just added a review for ' + data.productName + '.\n\nReviewer: ' + data.reviewerName + '\nRating: ' + data.rating + '/5\nComment: ' + (data.comment || 'No comment provided.') + '\n\nJump into the admin area to see it.';
    }

    return { type: type, to: email, subject: reviewSubject, body: reviewBody, variant: variant };
  }

  return { type: type, to: email, subject: 'Beautique update', body: 'Hello ' + firstName + ',\n\nA new update is ready for you.', variant: variant };
}

function sendEmail(type, email, data) {
  ensureEmailLog();
  var message = buildEmail(type, email, data);
  var history = readJson(emailLogFile);
  history.push({
    id: Date.now(),
    type: message.type,
    to: message.to,
    subject: message.subject,
    variant: message.variant,
    createdAt: new Date().toISOString()
  });
  writeJson(emailLogFile, history);
  console.log('[Beautique Email] ' + message.subject + ' -> ' + message.to);
  return sendWithResend(message).then(function() {
    return message;
  });
}

module.exports = {
  sendEmail: sendEmail,
  buildEmail: buildEmail
};
