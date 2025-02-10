// ================ פונקציות עזר ================
function waitForElement(selector) {
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                resolve(document.querySelector(selector));
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

// ================ ניהול בחירת תאגיד ================
const corporationFeature = {
    init: async () => {
        const select = await waitForElement('select[name="Corporation"]');
        select.value = '1';
        select.dispatchEvent(new Event('change', { bubbles: true }));
    }
};

// ================ ניהול שדה תאריך ================
const dateFeature = {
    // === פונקציות פורמט ותיקוף ===
    formatDate: (date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    },

    isValidDate: (day, month, year) => {
        // בדיקת טווחים
        if (day <= 0 || day > 31) return false;
        if (month <= 0 || month > 12) return false;
        if (year < 1900 || year > 2100) return false;

        // בדיקת ימים בחודש
        const daysInMonth = new Date(year, month, 0).getDate();
        if (day > daysInMonth) return false;

        return true;
    },

    // === ניהול כפתורים ===
    disableButtons: () => {
        const buttons = document.querySelectorAll('paper-button[edox-button]');
        buttons.forEach(button => {
            button.setAttribute('disabled', '');
            button.style.pointerEvents = 'none';
            button.style.opacity = '0.5';
        });
    },

    enableButtons: () => {
        const buttons = document.querySelectorAll('paper-button[edox-button]');
        buttons.forEach(button => {
            // בדיקה אם הכפתור מדוסבל על ידי המערכת המקורית
            const wasDisabledBySystem = button.hasAttribute('aria-disabled') && 
                                      button.getAttribute('aria-disabled') === 'true';
            
            // שחרור הכפתור רק אם המערכת המקורית לא דיסבלה אותו
            if (!wasDisabledBySystem) {
                button.removeAttribute('disabled');
                button.style.pointerEvents = '';
                button.style.opacity = '';
            }
        });
    },

    // === ניהול מצב תצוגה ===
    markAsInvalid: (input) => {
        // עיצוב השדה
        input.style.color = 'red';
        input.style.fontWeight = 'bold';
        
        // הוספת הודעת שגיאה
        const label = input.closest('.flex').querySelector('label');
        let errorSpan = label.querySelector('.date-error');
        if (!errorSpan) {
            errorSpan = document.createElement('span');
            errorSpan.className = 'date-error';
            errorSpan.style.color = 'red';
            errorSpan.style.marginRight = '5px';
            errorSpan.style.fontSize = '14px';
            label.appendChild(errorSpan);
        }
        errorSpan.textContent = ' - תאריך שגוי';

        dateFeature.disableButtons();
    },

    markAsValid: (input) => {
        // ניקוי עיצוב השדה
        input.style.color = '';
        input.style.fontWeight = '';
        
        // הסרת הודעת שגיאה
        const label = input.closest('.flex').querySelector('label');
        const errorSpan = label.querySelector('.date-error');
        if (errorSpan) {
            errorSpan.remove();
        }

        dateFeature.enableButtons();
    },

    // === פרסור והשלמת תאריך ===
    parseAndCompleteDate: (input) => {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1;

        input = input.trim();
        let parts = input.split(/[./-]/);
        
        // טיפול בקלט ללא מפרידים
        if (parts.length === 1) {
            const digits = input.replace(/\D/g, '');
            if (digits.length <= 2) {
                parts = [digits];
            } else if (digits.length <= 4) {
                parts = [digits.substring(0, 2), digits.substring(2)];
            } else {
                parts = [digits.substring(0, 2), digits.substring(2, 4), digits.substring(4)];
            }
        }

        let [day, month, year] = parts.map(part => parseInt(part || '0'));

        // בדיקת תקינות ראשונית
        if (parts.length >= 2 && (day > 31 || month > 12)) {
            return { value: input, isValid: false };
        }

        // השלמת ערכים חסרים
        if (day === 0) day = 1;
        if (!month) month = currentMonth;
        if (month === 0) month = 1;
        if (!year) year = currentYear;
        if (year < 100) {
            const currentCentury = Math.floor(currentYear / 100) * 100;
            year = currentCentury + year;
        }

        // בדיקת תקינות סופית
        const isValid = dateFeature.isValidDate(day, month, year);
        const formattedDate = isValid ? 
            `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}` : 
            input;

        return { value: formattedDate, isValid };
    },

    // === טיפול באירועים ===
    handleBlur: (e) => {
        const input = e.target.value.trim();
        if (input) {
            const result = dateFeature.parseAndCompleteDate(input);
            e.target.value = result.value;
            
            if (result.isValid) {
                dateFeature.markAsValid(e.target);
                e.target.dispatchEvent(new Event('input', { bubbles: true }));
                e.target.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                dateFeature.markAsInvalid(e.target);
            }
        }
    },

    handleClick: (e) => {
        e.target.select();
    },

    handleInput: (e) => {
        dateFeature.markAsValid(e.target);
    },

    // === אתחול ===
    init: async () => {
        const dateInput = await waitForElement('.edox-datepicker-input');
        
        // הגדרת ערך התחלתי
        dateInput.value = dateFeature.formatDate(new Date());
        dateFeature.markAsValid(dateInput);
        dateInput.dispatchEvent(new Event('input', { bubbles: true }));
        dateInput.dispatchEvent(new Event('change', { bubbles: true }));

        // הגדרת מאזינים
        dateInput.addEventListener('input', dateFeature.handleInput);
        dateInput.addEventListener('blur', dateFeature.handleBlur);
        dateInput.addEventListener('click', dateFeature.handleClick);
    }
};

// ================ ניהול תאריך תשלום ================
const paymentDateFeature = {
    // === מחיקת תאריך תשלום ===
    clearPaymentDate: () => {
        const paymentDateInput = document.querySelector('edox-datepicker[name="PaymentDueDate"] input');
        if (paymentDateInput) {
            // שומרים את הערך המקורי אם עוד לא שמרנו
            if (!paymentDateInput.dataset.originalValue) {
                paymentDateInput.dataset.originalValue = paymentDateInput.value;
            }
            // מוחקים את התאריך ומנקים את העיצוב
            paymentDateInput.value = '';
            dateFeature.markAsValid(paymentDateInput);
        }
    },

    // === טיפול בשדה תאריך תשלום ===
    handlePaymentDateClick: (e) => {
        e.target.select();
    },

    handlePaymentDateInput: (e) => {
        // מנקים את העיצוב של השדה כמו בתאריך ערך
        dateFeature.markAsValid(e.target);
    },

    handlePaymentDateBlur: (e) => {
        const input = e.target.value.trim();
        if (input) {
            const result = dateFeature.parseAndCompleteDate(input);
            e.target.value = result.value;
            
            if (result.isValid) {
                dateFeature.markAsValid(e.target);
                e.target.dispatchEvent(new Event('input', { bubbles: true }));
                e.target.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                dateFeature.markAsInvalid(e.target);
            }
        }
    },

    // === מעקב אחרי שינויים בשדה הספק ===
    observeSupplierChanges: () => {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                // בודקים אם השינוי הוא בתוכן של השדה
                if (mutation.type === 'childList' || 
                    (mutation.type === 'attributes' && 
                     (mutation.attributeName === 'class' || mutation.attributeName === 'value'))) {
                    const supplierInput = document.querySelector('input[name="Supplier"]');
                    if (supplierInput && supplierInput.value && !supplierInput.classList.contains('ng-empty')) {
                        // נחכה קצת לתת לממשק להתעדכן
                        setTimeout(() => {
                            paymentDateFeature.setPaymentDate();
                        }, 500);
                    }
                }
            });
        });

        return observer;
    },

    // === הגדרת תאריך תשלום ===
    setPaymentDate: async () => {
        const supplierInput = document.querySelector('input[name="Supplier"]');
        // בודקים שיש ספק לפני שמנסים ללחוץ על הכפתור
        if (supplierInput && supplierInput.value && !supplierInput.classList.contains('ng-empty')) {
            try {
                // נחכה שהכפתור יופיע מחדש
                const dueDateButton = await waitForElement('paper-button[ng-click="ctrl.dueSetting()"]');
                if (dueDateButton && dueDateButton.offsetParent !== null) {
                    dueDateButton.click();
                }
            } catch (error) {
                console.log('לא נמצא כפתור תאריך תשלום');
            }
        }
    },

    // === מעקב אחרי שינויים בתאריך ערך ===
    handleValueDateInput: () => {
        // כשמתחילים להקליד, מוחקים את תאריך התשלום
        paymentDateFeature.clearPaymentDate();
    },

    handleValueDateChange: (e) => {
        // נחכה יותר זמן כדי לתת לממשק להתעדכן ולכפתור להופיע מחדש
        setTimeout(() => {
            paymentDateFeature.setPaymentDate();
        }, 1000);
    },

    // === אתחול ===
    init: async () => {
        const supplierInput = await waitForElement('input[name="Supplier"]');
        const valueDateInput = await waitForElement('.edox-datepicker-input');
        const paymentDateInput = await waitForElement('edox-datepicker[name="PaymentDueDate"] input');
        
        // מעקב אחרי שינויים בשדה הספק
        const observer = paymentDateFeature.observeSupplierChanges();
        observer.observe(supplierInput.parentElement, {
            childList: true,
            attributes: true,
            subtree: true,
            characterData: true
        });

        // מעקב אחרי שינויים בתאריך ערך
        valueDateInput.addEventListener('input', paymentDateFeature.handleValueDateInput);
        valueDateInput.addEventListener('change', paymentDateFeature.handleValueDateChange);

        // הגדרת מאזינים לשדה תאריך תשלום
        paymentDateInput.addEventListener('click', paymentDateFeature.handlePaymentDateClick);
        paymentDateInput.addEventListener('input', paymentDateFeature.handlePaymentDateInput);
        paymentDateInput.addEventListener('blur', paymentDateFeature.handlePaymentDateBlur);
    }
};

// ================ ניהול בחירת מחלקה ================
const departmentFeature = {
    // === בחירת מחלקה ===
    selectDepartment: async () => {
        try {
            // נחכה שהסלקט יופיע
            const select = await waitForElement('select[name="Department"]');
            if (select) {
                // נבחר את הערך הרצוי
                select.value = '44';
                // נפעיל את אירוע השינוי
                select.dispatchEvent(new Event('change', { bubbles: true }));
            }
        } catch (error) {
            console.log('לא נמצא שדה בחירת מחלקה');
        }
    },

    // === מעקב אחרי לחיצה על כפתור הוספת פריט ===
    handleAddItemClick: () => {
        // נחכה קצת שהשדה יתווסף לדף ואז נבחר מחלקה
        setTimeout(() => {
            departmentFeature.selectDepartment();
        }, 100);
    },

    // === אתחול ===
    init: async () => {
        // נחכה לכפתור הוספת פריט
        const addButton = await waitForElement('paper-button[ng-click="ctrl.invoice.newItem()"]');
        if (addButton) {
            // נוסיף מאזין ללחיצה
            addButton.addEventListener('click', departmentFeature.handleAddItemClick);
        }
    }
};

// ================ אתחול ראשי ================
if (window.location.href.includes('supplier-invoice/create')) {
    corporationFeature.init();
    dateFeature.init();
    paymentDateFeature.init();
    departmentFeature.init();
}