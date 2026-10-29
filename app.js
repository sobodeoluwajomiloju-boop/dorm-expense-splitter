let roommates = JSON.parse(localStorage.getItem('sen203_roommates')) || ['Alice', 'Bob', 'Charlie'];
let expenses = JSON.parse(localStorage.getItem('sen203_expenses')) || [];

const colors = ['bg-indigo-100 text-indigo-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700', 'bg-sky-100 text-sky-700', 'bg-purple-100 text-purple-700'];

function saveData() {
    localStorage.setItem('sen203_roommates', JSON.stringify(roommates));
    localStorage.setItem('sen203_expenses', JSON.stringify(expenses));
    renderApp();
}

function renderApp() {
    renderRoommates();
    renderFormOptions();
    renderExpenses();
    calculateSettlements();
}

function renderRoommates() {
    const list = document.getElementById('roommateList');
    if (roommates.length === 0) {
        list.innerHTML = `<p class="text-sm text-slate-400 italic">No roommates added yet.</p>`;
        return;
    }
    list.innerHTML = roommates.map((name, index) => {
        const colorClass = colors[index % colors.length];
        return `
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${colorClass}">
                ${name}
                <button onclick="removeRoommate('${name}')" class="hover:text-rose-900 font-bold ml-1">&times;</button>
            </span>
        `;
    }).join('');
}

function renderFormOptions() {
    const paidBySelect = document.getElementById('paidBySelect');
    const splitCheckboxes = document.getElementById('splitCheckboxes');

    paidBySelect.innerHTML = roommates.map(r => `<option value="${r}">${r}</option>`).join('');
    
    if (roommates.length === 0) {
        splitCheckboxes.innerHTML = `<span class="text-xs text-slate-400 italic">Add roommates first.</span>`;
        return;
    }

    splitCheckboxes.innerHTML = roommates.map(r => `
        <label class="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" name="splitMember" value="${r}" checked class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4">
            ${r}
        </label>
    `).join('');
}

function addRoommate(e) {
    e.preventDefault();
    const input = document.getElementById('roommateName');
    const name = input.value.trim();
    if (name && !roommates.includes(name)) {
        roommates.push(name);
        input.value = '';
        saveData();
    }
}

function removeRoommate(name) {
    roommates = roommates.filter(r => r !== name);
    expenses = expenses.filter(exp => exp.paidBy !== name);
    saveData();
}

function addExpense(e) {
    e.preventDefault();
    const description = document.getElementById('expenseDesc').value;
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const category = document.getElementById('expenseCategory').value;
    const paidBy = document.getElementById('paidBySelect').value;
    
    const checkboxes = document.querySelectorAll('input[name="splitMember"]:checked');
    const splitAmong = Array.from(checkboxes).map(cb => cb.value);

    if (splitAmong.length === 0) {
        alert('Please select at least one roommate to split the expense among.');
        return;
    }

    const newExpense = {
        id: Date.now(),
        description,
        amount,
        category,
        paidBy,
        splitAmong
    };

    expenses.push(newExpense);
    document.getElementById('expenseForm').reset();
    renderFormOptions();
    saveData();
}

function deleteExpense(id) {
    expenses = expenses.filter(exp => exp.id !== id);
    saveData();
}

function renderExpenses() {
    const tbody = document.getElementById('expenseTableBody');
    document.getElementById('expenseCount').innerText = `${expenses.length} items`;

    if (expenses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-6 text-slate-400 italic">No expenses logged yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = expenses.slice().reverse().map(exp => `
        <tr class="border-b border-slate-50 hover:bg-slate-50/50 transition">
            <td class="py-3">
                <span class="font-medium text-slate-800 block">${exp.description}</span>
                <span class="text-xs text-slate-400">${exp.category} &bull; Split among: ${exp.splitAmong.join(', ')}</span>
            </td>
            <td class="py-3 text-slate-600">${exp.paidBy}</td>
            <td class="py-3 font-semibold text-slate-800">$${exp.amount.toFixed(2)}</td>
            <td class="py-3 text-right">
                <button onclick="deleteExpense(${exp.id})" class="text-rose-500 hover:text-rose-700 text-xs font-medium px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 transition">Delete</button>
            </td>
        </tr>
    `).join('');
}

function calculateSettlements() {
    const container = document.getElementById('settlementContainer');
    
    if (roommates.length === 0 || expenses.length === 0) {
        container.innerHTML = `<p class="text-slate-400 text-sm italic">Add roommates and expenses to calculate balances.</p>`;
        return;
    }

    let balances = {};
    roommates.forEach(r => balances[r] = 0);

    expenses.forEach(exp => {
        balances[exp.paidBy] += exp.amount;
        const splitAmount = exp.amount / exp.splitAmong.length;
        exp.splitAmong.forEach(member => {
            balances[member] -= splitAmount;
        });
    });

    let debtors = [];
    let creditors = [];

    for (let r in balances) {
        let bal = Math.round(balances[r] * 100) / 100;
        if (bal < -0.01) debtors.push({ name: r, amount: -bal });
        else if (bal > 0.01) creditors.push({ name: r, amount: bal });
    }

    let transactions = [];
    let i = 0, j = 0;

    while (i < debtors.length && j < creditors.length) {
        let debtor = debtors[i];
        let creditor = creditors[j];
        let settledAmount = Math.min(debtor.amount, creditor.amount);

        transactions.push(`${debtor.name} pays <strong>$${settledAmount.toFixed(2)}</strong> to ${creditor.name}`);

        debtor.amount -= settledAmount;
        creditor.amount -= settledAmount;

        if (debtor.amount < 0.01) i++;
        if (creditor.amount < 0.01) j++;
    }

    if (transactions.length === 0) {
        container.innerHTML = `<p class="text-emerald-600 text-sm font-medium">✨ All balances are settled up evenly!</p>`;
        return;
    }

    container.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            ${Object.entries(balances).map(([name, bal]) => `
                <div class="p-3 rounded-xl border border-slate-100 bg-slate-50 flex justify-between items-center text-sm">
                    <span class="font-medium text-slate-700">${name}</span>
                    <span class="font-bold ${bal >= 0 ? 'text-emerald-600' : 'text-rose-600'}">
                        ${bal >= 0 ? '+' : ''}$${bal.toFixed(2)}
                    </span>
                </div>
            `).join('')}
        </div>
        <div class="border-t border-slate-100 pt-4">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Optimal Payments Required</h3>
            <ul class="space-y-2">
                ${transactions.map(t => `<li class="bg-indigo-50/50 text-indigo-900 p-2.5 rounded-xl text-sm border border-indigo-100/50">👉 ${t}</li>`).join('')}
            </ul>
        </div>
    `;
}

function resetAllData() {
    if (confirm("Are you sure you want to clear all roommates and expenses?")) {
        localStorage.clear();
        roommates = ['Alice', 'Bob', 'Charlie'];
        expenses = [];
        saveData();
    }
}

renderApp();
