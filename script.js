const API_URL = 'https://script.google.com/macros/s/AKfycbykjlTkHepuPCg3NeSzsdncYYGRT0YLErO0Sp4NS7Ma0DJOmYhiF3-F923B-pgk9CcX/exec';
let currentUser = null;
let currentMode = 'mb';

// Initialization
document.addEventListener('DOMContentLoaded', () => {
	lucide.createIcons();
	switchTab('mb');
});

async function handleLogin() {
	const user = document.getElementById('login-user').value.trim();
	const pass = document.getElementById('login-pass').value.trim();
	if(!user || !pass) return alert("الرجاء إدخال البيانات");
	
	const btn = document.getElementById('login-btn');
	btn.innerText = "جاري التحقق..."; btn.disabled = true;
	
	try {
		const res = await fetch(API_URL, { 
			method: 'POST', 
			body: JSON.stringify({ action: 'login', user, pass }) 
		});
		const result = await res.json();
		if(result.status === "success") { 
			currentUser = result; 
			setupUI(); 
		} else { 
			alert("خطأ في بيانات الدخول"); 
		}
	} catch(e) { 
		alert("فشل الاتصال بالسيرفر"); 
	}
	btn.innerText = "تسجيل الدخول"; btn.disabled = false;
}

function setupUI() {
	document.getElementById('login-page').classList.add('hidden');
	document.getElementById('main-app').classList.remove('hidden');
	document.getElementById('user-display').innerText = `أهلاً، ${currentUser.name}`;
	document.getElementById('role-tag').innerText = currentUser.role;
	if(currentUser.role === 'Admin') document.getElementById('nav-attendance').classList.remove('hidden');
	navTo('dashboard');
}

function switchTab(mode) {
	currentMode = mode;
	const container = document.getElementById('form-fields');
	if(mode === 'mb') {
		document.getElementById('tab-mb').className = "flex-1 py-3 rounded-2xl font-bold bg-[#632323] text-white shadow-lg";
		document.getElementById('tab-ext').className = "flex-1 py-3 rounded-2xl font-bold bg-white text-[#632323] border border-[#eee]";
		container.innerHTML = `
			<div class="flex justify-between items-center mb-1"><span class="text-xs font-black">اسم العضو</span> <span class="badge-free">FREE SERVICE</span></div>
			<input type="text" id="clientName" placeholder="أدخل اسم العضو">
			<input type="text" id="plateNum" placeholder="رقم اللوحة (أ ب ج 123)" class="text-center text-xl">
			<input type="number" id="cardNum" placeholder="رقم الكرت" class="text-center text-xl">
		`;
	} else {
		document.getElementById('tab-ext').className = "flex-1 py-3 rounded-2xl font-bold bg-[#632323] text-white shadow-lg";
		document.getElementById('tab-mb').className = "flex-1 py-3 rounded-2xl font-bold bg-white text-[#632323] border border-[#eee]";
		container.innerHTML = `
			<input type="text" id="clientName" placeholder="اسم العميل الخارجي">
			<input type="number" id="clientPhone" placeholder="رقم الجوال ">
			<input type="text" id="plateNum" placeholder="رقم اللوحة" class="text-center text-xl">
			<input type="number" id="cardNum" placeholder="رقم الكرت" class="text-center text-xl">
		`;
	}
}

async function saveProcess() {
	const plate = document.getElementById('plateNum').value;
	const card = document.getElementById('cardNum').value;
	const clientInput = document.getElementById('clientName').value;
	const phone = (currentMode === 'external') ? (document.getElementById('clientPhone').value || '-') : '-';

	if(!plate || !card || !clientInput) return alert("الرجاء إكمال كافة الحقول!");

	const data = {
		action: 'saveInvoice', 
		plateNum: plate, 
		cardNum: card, 
		clientName: currentMode === 'mb' ? 'Mind Break member' : clientInput, 
		valetName: currentUser.name,
		serviceType: currentMode === 'mb' ? 'Free' : 'Paid', 
		amount: currentMode === 'mb' ? 0 : 25,
		phone: phone, 
		status: 'Parked'
	};

	const btn = document.getElementById('save-btn');
	btn.disabled = true; btn.innerText = "جاري الحفظ...";

	try {
		await fetch(API_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(data) });
		await captureAndDownload(data);
		alert("تم حفظ العملية وإصدار الإيصال!");
		switchTab(currentMode);
	} catch(e) { 
		alert("حدث خطأ في الاتصال"); 
	}
	btn.disabled = false; btn.innerText = "إرسال وحفظ العملية";
}

async function captureAndDownload(data) {
	const cap = document.getElementById('receipt-capture');
	document.getElementById('cap-data').innerHTML = `
		<div class="flex justify-between border-b pb-2"><span>اسم العميل:</span><span>${data.clientName || '-'}</span></div>
		<div class="flex justify-between border-b pb-2"><span>رقم الهاتف:</span><span>${data.phone || '-'}</span></div>
		<div class="flex justify-between border-b pb-2"><span>اللوحة:</span><span>${data.plateNum}</span></div>
		<div class="flex justify-between border-b pb-2"><span>الكرت:</span><span>#${data.cardNum}</span></div>
		<div class="flex justify-between border-b pb-2"><span>الخدمة:</span><span>${data.serviceType === 'Free' ? 'FREE SERVICE' : 'PAID SERVICE'}</span></div>
		${data.amount > 0 ? `<div class="flex justify-between border-b pb-2"><span>المبلغ:</span><span>${data.amount} SAR</span></div>` : ''}
	`;
	
	document.getElementById('cap-staff-name').innerText = currentUser.name;
	document.getElementById('cap-time').innerText = new Date().toLocaleString('en-US');

	const canvas = await html2canvas(cap, { scale: 2 });
	const link = document.createElement('a');
	link.download = `Invoice-${data.plateNum}.png`;
	link.href = canvas.toDataURL();
	link.click();
}

async function loadReports() {
	const list = document.getElementById('reports-list');
	list.innerHTML = `<div class="text-center py-10 opacity-50 font-bold">جاري تحديث البيانات...</div>`;
	try {
		const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getReports' }) });
		const reports = await res.json();
		list.innerHTML = '';
		reports.forEach(r => {
			const isParked = r.vehicleStatus === 'Parked';
			list.innerHTML += `
				<div class="invoice-card shadow-sm border-r-4 ${isParked ? 'border-orange-400' : 'border-green-500'}">
					<div class="flex justify-between items-center mb-2">
						<span class="text-xl font-black text-[#632323]">${r.plateNum}</span>
						<span class="text-[10px] font-bold px-2 py-1 rounded bg-gray-100 uppercase">${isParked ? '🅿️ Parked' : '✅ Returned'}</span>
					</div>
					<div class="text-[11px] opacity-60 mb-4">
						<p>العميل: ${r.clientName} ${r.serviceType === 'Free' ? '(Free)' : ''}</p>
						<p>الكرت: #${r.cardNum} | الموظف: ${r.valet}</p>
					</div>
					<div class="flex gap-2">
						<button onclick='reExport(${JSON.stringify(r)})' class="flex-1 bg-gray-100 text-gray-800 py-2 rounded-lg text-[10px] font-black border border-gray-200">تصدير إيصال</button>
						${isParked ? `<button onclick="updateStatus('${r.plateNum}', '${r.cardNum}', 'Returned')" class="flex-1 bg-green-600 text-white py-2 rounded-lg text-[10px] font-black shadow-md shadow-green-100">تأكيد التسليم</button>` : ''}
					</div>
				</div>`;
		});
		lucide.createIcons();
	} catch(e) { list.innerHTML = "فشل تحديث التقارير"; }
}

async function updateStatus(plate, card, newStatus) {
	if(!confirm("هل أنت متأكد من تغيير حالة المركبة؟")) return;
	
	// Find the button that was clicked to show it's working
	const btn = event.target;
	const originalText = btn.innerText;
	btn.disabled = true;
	btn.innerText = "جاري التحديث...";

	try {
		await fetch(API_URL, { 
			method: 'POST', 
			mode: 'no-cors', 
			body: JSON.stringify({ 
				action: 'updateVehicleStatus', 
				plateNum: plate, 
				cardNum: card, 
				status: newStatus 
			}) 
		});
		
		// Visual feedback
		alert("تم تحديث حالة السيارة بنجاح");
		
		// Wait a moment for the Sheet to catch up then reload
		setTimeout(() => {
			loadReports();
		}, 1000);

	} catch(e) { 
		alert("حدث خطأ في الاتصال بالسيرفر"); 
		btn.disabled = false;
		btn.innerText = originalText;
	}
}

function reExport(r) {
	captureAndDownload({
		plateNum: r.plateNum, cardNum: r.cardNum, serviceType: r.serviceType, 
		clientName: r.clientName, phone: r.phone || '-', amount: r.amount || 0
	});
}

// --- Attendance Section ---

async function loadAttendanceSystem() {
	const list = document.getElementById('attendance-list');
	list.innerHTML = `<div class="text-center py-10 opacity-50 font-black">جاري جلب قائمة الموظفين...</div>`;
	try {
		const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getEmployees' }) });
		const emps = await res.json();
		list.innerHTML = "";
		emps.forEach(emp => {
			list.innerHTML += `
			<div class="glass p-4 mb-3 border border-gray-100 shadow-sm">
				<div class="flex justify-between items-center mb-3">
					<span class="text-[10px] bg-[#632323]/10 text-[#632323] px-2 py-1 rounded font-black">${emp.job}</span>
					<div class="font-black text-[#632323]">${emp.name}</div>
				</div>
				<div class="flex gap-2">
					<select id="stat-${emp.name}" class="flex-1 p-3 bg-white rounded-xl text-[11px] font-black">
						<option value="Present">Present</option>
						<option value="Absent">Absent</option>
					</select>
					<input type="number" id="hrs-${emp.name}" value="8" class="w-16 p-3 bg-white rounded-xl text-center font-bold">
					<button onclick="confirmAtt('${emp.name}')" class="bg-[#632323] text-white px-4 rounded-xl text-[11px] font-black active:scale-95 shadow-lg shadow-[#632323]/20">حفظ</button>
				</div>
			</div>`;
		});
	} catch(e) { list.innerHTML = "فشل في التحميل"; }
}

async function confirmAtt(name) {
	const data = { 
		action: 'submitAttendance', 
		employeeName: name, 
		hours: document.getElementById(`hrs-${name}`).value, 
		status: document.getElementById(`stat-${name}`).value, 
		date: new Date().toLocaleDateString('en-CA'), 
		submittedBy: currentUser.name 
	};
	try {
		await fetch(API_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(data) });
		alert(`تم تحضير ${name}`);
	} catch(e) { alert("خطأ في الإرسال"); }
}

function navTo(id) {
	document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
	document.querySelectorAll('nav button').forEach(b => b.classList.remove('nav-active'));
	document.getElementById(id).classList.add('active');
	if(document.getElementById('nav-'+id)) document.getElementById('nav-'+id).classList.add('nav-active');
	
	if(id === 'reports') loadReports();
	if(id === 'attendance') loadAttendanceSystem();
}
