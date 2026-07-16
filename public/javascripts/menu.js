$(document).ready(function(){
	var element = $('meta[name="active-menu"]').attr('content');
	$('#' + element).addClass('active');

  var $locationText = $('#delivery-location-text');
  var $locationInput = $('#navbar-delivery-address');
  var $saveLocation = $('#navbar-delivery-save');
  var $openMap = $('#navbar-delivery-map');
  var $mapModal = $('#delivery-map-modal');
  var $closeMap = $('#navbar-delivery-close');
  var $cancelMap = $('#navbar-delivery-map-cancel');
  var $locateMap = $('#navbar-delivery-locate');
  var $saveMap = $('#navbar-delivery-map-save');
  var $mapStatus = $('#navbar-delivery-map-status');
  var $locationMessage = $('#navbar-delivery-message');
  var $locationTextSpan = $('#delivery-location-text');
  var signedIn = $locationInput.data('signedIn') === true || $locationInput.data('signedIn') === 'true';
  var selectedAddress = '';
  var selectedCoords = null;
  var map = null;
  var marker = null;

  function setLocationText(value) {
    $locationText.text(value ? value : 'Delivery address');
  }

  function showMessage(message, isError) {
    $locationMessage.text(message).css('color', isError ? '#c0392b' : '#27ae60');
  }

  function setMapStatus(message, isError) {
    $mapStatus.text(message).css('color', isError ? '#c0392b' : '#6b4f4f');
  }

  function centerMapAt(lat, lon, zoom) {
    if (!map) {
      return;
    }
    var latLng = L.latLng(lat, lon);
    map.setView(latLng, zoom || 16);
    if (marker) {
      marker.setLatLng(latLng);
    } else {
      marker = L.marker(latLng).addTo(map);
    }
    selectedCoords = latLng;
  }

  function loadSavedAddress() {
    var storedAddress = localStorage.getItem('beautiqueDeliveryLocation');
    if (storedAddress && !signedIn) {
      $locationInput.val(storedAddress);
      setLocationText(storedAddress);
    }

    if (signedIn) {
      setLocationText($locationInput.val().trim());
    }
  }

  function openMapModal() {
    $mapModal.css('display', 'flex');
    if (!map) {
      map = L.map('navbar-delivery-map-container').setView([51.505, -0.09], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      map.on('click', function(e) {
        selectedCoords = e.latlng;
        if (marker) {
          marker.setLatLng(selectedCoords);
        } else {
          marker = L.marker(selectedCoords).addTo(map);
        }
        setMapStatus('Coordinates selected: ' + selectedCoords.lat.toFixed(5) + ', ' + selectedCoords.lng.toFixed(5) + '. Getting address...');
        reverseGeocode(selectedCoords.lat, selectedCoords.lng);
      });
    }
    if (selectedCoords) {
      map.invalidateSize();
    }
  }

  function closeMapModal() {
    $mapModal.hide();
  }

  function reverseGeocode(lat, lon) {
    $.getJSON('https://nominatim.openstreetmap.org/reverse', {
      format: 'jsonv2',
      lat: lat,
      lon: lon,
      addressdetails: 1
    }).done(function(data) {
      selectedAddress = data.display_name || 'Selected location';
      $locationInput.val(selectedAddress);
      setMapStatus(selectedAddress);
      setLocationText(selectedAddress);
    }).fail(function() {
      selectedAddress = 'Lat: ' + lat.toFixed(5) + ', Lon: ' + lon.toFixed(5);
      $locationInput.val(selectedAddress);
      setMapStatus(selectedAddress, true);
      setLocationText(selectedAddress);
    });
  }

  function saveAddress(address) {
    if (signedIn) {
      $.ajax({
        url: '/api/profile/update',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ address: address }),
        success: function(response) {
          setLocationText(address);
          showMessage('Delivery address saved.');
        },
        error: function(xhr) {
          showMessage(xhr.responseJSON && xhr.responseJSON.message ? xhr.responseJSON.message : 'Address save failed.', true);
        }
      });
    } else {
      localStorage.setItem('beautiqueDeliveryLocation', address);
      setLocationText(address);
      showMessage('Delivery address saved locally.');
    }
  }

  function locateUser() {
    if (!navigator.geolocation) {
      setMapStatus('Geolocation is not available in this browser.', true);
      return;
    }

    setMapStatus('Finding your current location...');
    navigator.geolocation.getCurrentPosition(function(position) {
      var lat = position.coords.latitude;
      var lon = position.coords.longitude;
      centerMapAt(lat, lon, 16);
      setMapStatus('Exact location found. Getting address...');
      reverseGeocode(lat, lon);
    }, function(error) {
      setMapStatus('Unable to get current location: ' + (error.message || 'permission denied'), true);
    }, { enableHighAccuracy: true, timeout: 10000 });
  }

  loadSavedAddress();

  $saveLocation.on('click', function(event) {
    event.preventDefault();
    var address = $locationInput.val().trim();
    if (!address) {
      showMessage('Please enter a delivery address.', true);
      return;
    }
    saveAddress(address);
  });

  $openMap.on('click', function(event) {
    event.preventDefault();
    openMapModal();
  });

  $closeMap.on('click', function() {
    closeMapModal();
  });

  $cancelMap.on('click', function() {
    closeMapModal();
  });

  $locateMap.on('click', function() {
    locateUser();
  });

  $saveMap.on('click', function() {
    if (!selectedAddress) {
      setMapStatus('Please click a location on the map first.', true);
      return;
    }
    saveAddress(selectedAddress);
    closeMapModal();
  });
});
