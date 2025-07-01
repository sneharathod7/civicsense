document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/citizen-login.html';
    return;
  }

  // Initialize user data and avatar
  await initializeUserData();
  
  // Fetch and display complaints
  await fetchComplaints();

  // Setup event listeners
  setupEventListeners();
});

async function initializeUserData() {
  try {
    const response = await fetch('/api/v1/auth/me', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user data');
    }

    const { data } = await response.json();
    
    // Update user info in header
    document.getElementById('ddUserName').textContent = `${data.firstName} ${data.lastName}`;
    document.getElementById('ddUserEmail').textContent = data.email;
    
    // Update greeting
    document.getElementById('greeting').innerText = `🎉 Welcome back, ${data.firstName}! 👋`;

    // Update avatar
    updateAvatarDisplay(data.photo, data.firstName, data.lastName);

    // Store user data in localStorage
    localStorage.setItem('user', JSON.stringify(data));
    localStorage.setItem('userId', data._id);

  } catch (error) {
    console.error('Error fetching user data:', error);
    showMessage('Failed to load user data', true);
  }
}

function updateAvatarDisplay(photoUrl, firstName, lastName) {
  const userAvatar = document.getElementById('userAvatar');
  
  if (photoUrl) {
    // If there's a photo URL, use it
    userAvatar.src = `/uploads/${photoUrl}`;
  } else if (firstName && lastName) {
    // If no photo but we have a name, use initials
    const initialsUrl = generateInitialsAvatar(firstName, lastName);
    userAvatar.src = initialsUrl;
  }
}

function generateInitialsAvatar(firstName, lastName) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 200;
  canvas.height = 200;

  // Draw background
  context.fillStyle = '#0d6efd';
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Draw text
  context.font = 'bold 80px Arial';
  context.fillStyle = 'white';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`;
  context.fillText(initials, canvas.width/2, canvas.height/2);

  return canvas.toDataURL('image/png');
}

async function fetchComplaints() {
  try {
    const userId = localStorage.getItem('userId');
    const res = await fetch(`/api/reports?userId=${userId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    const data = await res.json();
    if (!data.success) {
      showMessage('Failed to load complaints.', true);
      return;
    }
    
    const complaints = data.data;
    populateStats(complaints);
    populateRecent(complaints);
    populateCommunity(complaints);

    // Update welcome banner lines
    document.getElementById('achievementHighlight').innerText =
      `🌟 You've made ${complaints.length} reports this month – You're a Civic Champion! 🏆`;
    const resolved = complaints.filter(c => c.status === 'Resolved').length;
    document.getElementById('impactSummary').innerText =
      `📊 Your impact: ${resolved} issues resolved, helping ${resolved * 10}+ citizens`;
  } catch (err) {
    console.error('Error fetching complaints:', err);
    showMessage('Server error fetching complaints.', true);
  }
}

function setupEventListeners() {
  // Logout handler
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.clear();
      window.location.href = '/citizen-login.html';
    });
  }

  // Theme switch handler
  const themeSwitch = document.getElementById('themeSwitch');
  if (themeSwitch) {
    themeSwitch.addEventListener('change', () => {
      document.documentElement.setAttribute('data-bs-theme', 
        themeSwitch.checked ? 'dark' : 'light'
      );
    });
  }
}

function showMessage(message, isError = false) {
  // You can implement this based on your UI needs
  console.log(isError ? 'Error: ' : 'Message: ', message);
}

function populateStats(complaints) {
  const total = complaints.length;
  const newCount = complaints.filter(c => ['New', 'Pending'].includes(c.status)).length;
  const progress = complaints.filter(c => ['In Progress', 'Progress'].includes(c.status)).length;
  const resolved = complaints.filter(c => c.status === 'Resolved').length;

  const resolutionRate = total ? Math.round((resolved / total) * 100) : 0;
  const ratingAvg = total ? (complaints.reduce((s, c) => s + (c.rating || 0), 0) / total).toFixed(1) : '0';
  const points = resolved * 10;

  document.getElementById('statReported').innerText = total;
  document.getElementById('statNew').innerText = newCount;
  document.getElementById('statProgress').innerText = progress;
  document.getElementById('statResolved').innerText = resolved;
  document.getElementById('statRate').innerText = `${resolutionRate}%`;
  document.getElementById('statRating').innerText = ratingAvg;
  document.getElementById('statPoints').innerText = points;
}

function populateRecent(complaints){
  const list=document.getElementById('recentList');
  if(!list) return;
  list.innerHTML='';
  const sorted=[...complaints].sort((a,b)=>new Date(b.updatedAt||b.createdAt)-new Date(a.updatedAt||a.createdAt)).slice(0,5);
  if(!sorted.length){list.innerHTML='<li class="list-group-item text-muted">No recent activity</li>';return;}
  sorted.forEach(c=>{
    const li=document.createElement('li');
    li.className='list-group-item d-flex justify-content-between align-items-center';
    li.innerHTML=`<span><strong>#${c.ticketId||c.id}</strong> - ${c.issueType}</span> <span class="badge ${c.status==='Resolved'?'bg-success':c.status==='In Progress'?'bg-warning text-dark':'bg-secondary'}">${c.status}</span>`;
    list.appendChild(li);
  });
}

function populateCommunity(complaints){
  const el=document.getElementById('communityImpact');
  if(!el) return;
  const resolved=complaints.filter(c=>c.status==='Resolved').length;
  const total=complaints.length;
  const resolutionRate= total? Math.round((resolved/total)*100):0;
  el.querySelector('p').innerText=`🌟 You've resolved ${resolved} of ${total} reported issues (Resolution Rate: ${resolutionRate}%)`;
}

function filterAndRender() {
  let filtered = window.allComplaints || [];
  // Text search
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  if (q) {
    filtered = filtered.filter(c => (c.ticketId || c.id).toString().toLowerCase().includes(q) ||
      (c.issueType || '').toLowerCase().includes(q) ||
      (c.department || '').toLowerCase().includes(q));
  }
  // Status filter
  const statusVal = document.getElementById('statusFilter').value;
  if (statusVal) {
    filtered = filtered.filter(c => c.status === statusVal);
  }
  // Category filter (assuming issueType maps)
  const catVal = document.getElementById('categoryFilter').value;
  if (catVal) {
    filtered = filtered.filter(c => c.issueType === catVal);
  }
  populateTable(filtered);
}

function populateTable(complaints) {
  const tbody = document.getElementById('complaintsTableBody');
  tbody.innerHTML = '';
  complaints.forEach((cmp) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${cmp.ticketId || cmp.id}</td>
      <td>${cmp.issueType}</td>
      <td>${cmp.department}</td>
      <td>${cmp.status}</td>
      <td>${new Date(cmp.createdAt).toLocaleString()}</td>
    `;
    tbody.appendChild(tr);
  });
}


