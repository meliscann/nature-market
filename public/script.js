let currentUser = null;

// Open/close modals
const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));

document.getElementById('openRegisterModal').onclick = () => registerModal.show();
document.getElementById('openLoginModal').onclick = () => loginModal.show();

// Registration
document.getElementById('registerForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const form = e.target;
  const data = {
    name: form.name.value,
    email: form.email.value,
    password: form.password.value
  };
  const res = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const result = await res.json();
  const resultDiv = document.getElementById('registerResult');
  if (result.success) {
    currentUser = result.user;
    document.getElementById('logoutBtn').classList.remove('d-none');
    document.getElementById('cartDropdown').classList.remove('d-none');
    loadProducts();
    loadCart();

    resultDiv.textContent = 'Registration successful! You are now logged in.';
    setTimeout(() => {
      registerModal.hide();
      resultDiv.textContent = '';
      form.reset();
    }, 1200);
  } else {
    resultDiv.textContent = result.error || 'An error occurred.';
  }
});

// Login
document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const form = e.target;
  const data = {
    email: form.email.value,
    password: form.password.value
  };
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const result = await res.json();
  const resultDiv = document.getElementById('loginResult');
  if (result.success) {
    currentUser = result.user;
    resultDiv.textContent = '';
    loginModal.hide();
    form.reset();
    document.getElementById('logoutBtn').classList.remove('d-none');
    document.getElementById('cartDropdown').classList.remove('d-none');
    loadProducts();
    loadCart();
  } else {
    resultDiv.textContent = result.error || 'Bir hata oluştu.';
  }
});

// Logout
document.getElementById('logoutBtn').onclick = async function() {
  await fetch('/api/logout', { method: 'POST' });
  currentUser = null;
  document.getElementById('logoutBtn').classList.add('d-none');
  document.getElementById('cartDropdown').classList.add('d-none');
  document.getElementById('cartList').innerHTML = '';
  document.getElementById('cartTotal').textContent = '0.00';
  loadProducts(); // To disable buttons again
};

// Fetch and display products
async function loadProducts() {
  const res = await fetch('/api/products');
  const products = await res.json();
  const productsRow = document.getElementById('productsRow');
  productsRow.innerHTML = '';
  products.forEach(product => {
    const col = document.createElement('div');
    col.className = 'col-sm-6 col-lg-3 mb-4';
    col.innerHTML = `
      <div class="card product-card h-100">
        <img src="${product.image}" class="card-img-top product-img" alt="${product.name}">
        <div class="card-body d-flex flex-column">
          <h5 class="card-title">${product.name}</h5>
          <p class="card-text">${product.desc}</p>
          <div class="mt-auto price-and-btn">
            <div class="fw-bold text-success mb-2 product-price">${product.price.toFixed(2)} TL</div>
            <button class="btn btn-outline-success w-100 add-to-cart-btn" data-id="${product.id}">Add to Cart</button>
          </div>
        </div>
      </div>
    `;
    productsRow.appendChild(col);
  });

  document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    if (!currentUser) {
      btn.disabled = true;
      btn.title = 'Please log in to add to cart.';
      btn.classList.add('btn-secondary');
    } else {
      btn.onclick = async function() {
        await fetch('/api/cart/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: btn.dataset.id })
        });
        loadCart();
      };
    }
  });
}

// Fetch and display cart (for navbar dropdown)
async function loadCart() {
  const res = await fetch('/api/cart');
  const cart = await res.json();
  const cartList = document.getElementById('cartList');
  const cartTotal = document.getElementById('cartTotal');
  cartList.innerHTML = '';
  let total = 0;

  cart.forEach(item => {
    total += item.price * item.qty;
    const itemHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <div class="fw-semibold">${item.name}</div>
          <div class="text-muted">${item.price.toFixed(2)} TL</div>
        </div>
        <div class="d-flex align-items-center gap-1">
          <button class="btn btn-sm btn-outline-secondary decrease-qty" data-id="${item.id}">−</button>
          <span class="px-2">${item.qty}</span>
          <button class="btn btn-sm btn-outline-secondary increase-qty" data-id="${item.id}">+</button>
          <button class="btn btn-sm btn-danger remove-item ms-1" data-id="${item.id}">&times;</button>
        </div>
      </div>
    `;
    cartList.insertAdjacentHTML('beforeend', itemHTML);
  });

  cartTotal.textContent = total.toFixed(2);

  document.querySelectorAll('.increase-qty').forEach(btn => {
    btn.onclick = async function() {
      await fetch('/api/cart/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: btn.dataset.id, change: 1 })
      });
      loadCart();
    };
  });

  document.querySelectorAll('.decrease-qty').forEach(btn => {
    btn.onclick = async function() {
      await fetch('/api/cart/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: btn.dataset.id, change: -1 })
      });
      loadCart();
    };
  });

  document.querySelectorAll('.remove-item').forEach(btn => {
    btn.onclick = async function() {
      await fetch('/api/cart/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: btn.dataset.id })
      });
      loadCart();
    };
  });

  const clearBtn = document.getElementById('clearCartBtn');
  if (clearBtn) {
    clearBtn.onclick = async function () {
      const confirmClear = confirm("Are you sure you want to clear the entire cart?");
      if (!confirmClear) return;
      await fetch('/api/cart/clear', { method: 'POST' });
      loadCart();
    };
  }
}

// Load products when the page is loaded
loadProducts();
