$(function () {
  var $form = $('#auth-form');
  var $status = $('#auth-status');
  var $toggleButtons = $('.auth-toggle');
  var $otpSection = $('#otp-section');
  var $otpInput = $('#otp-code');
  var mode = 'signin';
  var pendingEmail = '';

  function updateAuthUI(user) {
    if (user) {
      $status.text('Signed in as ' + user.role + '.');
      $('#auth-form').hide();
      $otpSection.hide();
      $('#signout-area').show();
    }
  }

  $toggleButtons.on('click', function () {
    mode = $(this).data('mode');
    $toggleButtons.removeClass('active');
    $(this).addClass('active');
  });

  $form.on('submit', function (e) {
    e.preventDefault();

    var name = $('#auth-name').val().trim();
    var email = $('#auth-email').val().trim();
    var password = $('#auth-password').val();
    var role = $('#auth-role').val();

    if (!email || !password) {
      $status.text('Please fill in your email and password.');
      return;
    }

    var endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/signin';
    var payload = mode === 'signup' ? { name: name || email, email: email, password: password, role: role } : { email: email, password: password };

    $.ajax({
      url: endpoint,
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(payload),
      success: function (response) {
        if (response.requiresOtp) {
          pendingEmail = response.email;
          $otpSection.removeClass('hidden');
          $status.text('OTP sent to your email. Enter the code to continue.');
        } else if (response.otp) {
          pendingEmail = email;
          $otpSection.removeClass('hidden');
          $status.text('Account created. OTP sent to your email. Enter the code to verify.');
        } else {
          $status.text(mode === 'signup' ? 'Account created successfully.' : 'Signed in successfully.');
          updateAuthUI(response.user);
        }
      },
      error: function (xhr) {
        $status.text(xhr.responseJSON && xhr.responseJSON.message ? xhr.responseJSON.message : 'Authentication failed.');
      }
    });
  });

  $('#otp-submit').on('click', function () {
    var otp = $otpInput.val().trim();
    if (!otp) {
      $status.text('Please enter the OTP code.');
      return;
    }

    $.ajax({
      url: '/api/auth/verify-otp',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ email: pendingEmail, otp: otp }),
      success: function (response) {
        $status.text('OTP verified successfully.');
        updateAuthUI(response.user);
      },
      error: function (xhr) {
        $status.text(xhr.responseJSON && xhr.responseJSON.message ? xhr.responseJSON.message : 'OTP verification failed.');
      }
    });
  });

  $('#signout-button').on('click', function () {
    $.post('/api/auth/signout', function () {
      localStorage.removeItem('lunaUser');
      localStorage.removeItem('lunaCart');
      pendingEmail = '';
      $('#auth-form').show();
      $otpSection.hide();
      $('#signout-area').hide();
      $('#auth-email').val('');
      $('#auth-password').val('');
      $('#auth-name').val('');
      $status.text('Signed out. Please sign in again to continue.');
    });
  });

  $.get('/api/auth/me', function (response) {
    updateAuthUI(response.user);
  }).fail(function () {
    $('#auth-form').show();
    $otpSection.hide();
    $('#signout-area').hide();
  });
});
