// firebase-auth.js - Auth Functions (loaded after App is defined)

App.signUp = function(email, password) {
  if (!email || !password) {
    App.showToast('Please enter email and password');
    return;
  }
  auth.createUserWithEmailAndPassword(email, password)
    .then(function(userCredential) {
      App.showToast('Account created! Welcome.');
      App.showScreen('home');
    })
    .catch(function(error) {
      App.showToast(error.message);
    });
};

App.signIn = function(email, password) {
  if (!email || !password) {
    App.showToast('Please enter email and password');
    return;
  }
  auth.signInWithEmailAndPassword(email, password)
    .then(function(userCredential) {
      App.showToast('Logged in successfully!');
      App.showScreen('home');
    })
    .catch(function(error) {
      App.showToast(error.message);
    });
};

App.signOut = function() {
  auth.signOut().then(function() {
    App.currentUser = null;
    App.showToast('Signed out');
    App.showScreen('login');
  }).catch(function(error) {
    App.showToast(error.message);
  });
};

// Auth state listener
auth.onAuthStateChanged(function(user) {
  if (user) {
    App.currentUser = user;
    console.log('User logged in:', user.email);
    if (App.currentScreen === 'login') {
      App.showScreen('home');
    }
  } else {
    App.currentUser = null;
    console.log('No user signed in');
  }
});