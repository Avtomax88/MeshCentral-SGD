// Service Guardian Dashboard — плагин для MeshCentral.
//
// ВАЖНО: официальный, документированный хук MeshCentral есть только для
// вкладки на странице устройства (registerPluginTab/onDeviceRefreshEnd).
// Кнопки в левом меню — не документированная возможность, добавляется
// прямой работой с DOM. Это может потребовать подстройки под конкретную
// версию MeshCentral, если её интерфейс изменится в будущем.
//
// Правь эту константу под свой адрес дашборда:
var SG_DASHBOARD_URL = 'https://sgd.supporthound.ru';

// Диагностика: если этой строки нет в консоли браузера — значит сам файл
// плагина до браузера не долетает вообще (проблема на уровне MeshCentral/
// плагина, ещё до наших хуков), и дальше смотреть в этом файле нечего.
console.log('serviceguardian: JS-файл плагина загружен в браузере');

function serviceguardian() {
	var obj = {};

	// ---------- Кнопка на главной странице (перед "My Server") ----------

	obj.onWebUIStartupEnd = function () {
		console.log('serviceguardian: onWebUIStartupEnd сработал');
		try { sgAddLeftbarButton(); } catch (e) { console.log('serviceguardian: onWebUIStartupEnd error', e); }
	};

	// goPageEnd вызывается при каждой смене страницы внутри MeshCentral —
	// на случай, если сам левый список после первой загрузки перерисовывается
	// (например, после логина), пробуем добавить кнопку ещё раз (функция
	// сама проверяет, не добавлена ли уже).
	obj.goPageEnd = function () {
		try { sgAddLeftbarButton(); } catch (e) { /* тихо игнорируем */ }
	};

	function sgAddLeftbarButton() {
		if (document.getElementById('sg-leftbar-btn')) return; // уже добавлена

		// В этой версии MeshCentral пункты левого меню — иконки без текста,
		// но у пункта "My Server" есть стабильный id, цепляемся за него
		// напрямую (надёжнее, чем искать по тексту, которого тут нет).
		var myServerItem = document.getElementById('LeftMenuMyServer');
		if (!myServerItem) {
			console.log('serviceguardian: элемент #LeftMenuMyServer не найден — структура левого меню в этой версии MeshCentral отличается.');
			return;
		}

		var btn = myServerItem.cloneNode(true);
		btn.id = 'sg-leftbar-btn';
		btn.removeAttribute('onclick');
		btn.removeAttribute('onkeypress');
		btn.removeAttribute('data-target');
		btn.classList.remove('active');
		btn.title = 'Service Guardian Dashboard';
		btn.setAttribute('aria-label', 'Service Guardian Dashboard');

		// Своя иконка (щит с галочкой) вместо иконки сервера — чтобы не
		// путать визуально с "My Server".
		btn.innerHTML = '<svg viewBox="0 0 32 32" width="20" height="20" style="display:block;margin:0 auto" xmlns="http://www.w3.org/2000/svg">'
			+ '<path d="M16 3 L27 7 V16 C27 22.5 22 27.5 16 29 C10 27.5 5 22.5 5 16 V7 Z" fill="currentColor"/>'
			+ '<path d="M11 16.5 L14.3 19.8 L21 12.5" stroke="#0b0e14" stroke-width="2.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
			+ '</svg>';

		btn.addEventListener('click', function (e) {
			e.preventDefault();
			e.stopPropagation();
			sgShowFrame(SG_DASHBOARD_URL + '/');
		}, true);

		myServerItem.parentNode.insertBefore(btn, myServerItem);
		console.log('serviceguardian: кнопка добавлена в левое меню');
	}

	// Полноэкранный оверлей с iframe — не зависит от внутренней разметки
	// MeshCentral (надёжнее, чем пытаться встроиться в конкретную область
	// страницы, которая может быть занята текущим видом).
	function sgShowFrame(url) {
		var existing = document.getElementById('sg-frame-overlay');
		if (existing) {
			existing.style.display = 'flex';
			existing.querySelector('iframe').src = url;
			return;
		}

		var overlay = document.createElement('div');
		overlay.id = 'sg-frame-overlay';
		overlay.style.cssText = 'position:fixed; inset:0; z-index:100000; background:#0b0e14; display:flex; flex-direction:column;';

		var bar = document.createElement('div');
		bar.style.cssText = 'flex:0 0 auto; padding:10px 16px; background:#131722; border-bottom:1px solid #232a3a; display:flex; align-items:center; justify-content:space-between; font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;';
		bar.innerHTML = '<span style="color:#e7eaf0; font-weight:600;">Service Guardian Dashboard</span>';

		var closeBtn = document.createElement('button');
		closeBtn.textContent = '✕ Закрыть';
		closeBtn.style.cssText = 'background:#171c29; color:#8891a3; border:1px solid #232a3a; border-radius:6px; padding:6px 14px; cursor:pointer; font-size:13px;';
		closeBtn.onclick = function () { overlay.style.display = 'none'; };
		bar.appendChild(closeBtn);

		var iframe = document.createElement('iframe');
		iframe.src = url;
		iframe.style.cssText = 'flex:1 1 auto; border:none; width:100%;';

		overlay.appendChild(bar);
		overlay.appendChild(iframe);
		document.body.appendChild(overlay);
	}

	// ---------- Вкладка на странице устройства ----------

	obj.registerPluginTab = function () {
		console.log('serviceguardian: registerPluginTab сработал');
		return { tabId: 'serviceguardian', tabTitle: 'Guardian' };
	};

	obj.onDeviceRefreshEnd = function () {
		console.log('serviceguardian: onDeviceRefreshEnd сработал');
		try { sgFillDeviceTab(); } catch (e) { console.log('serviceguardian: onDeviceRefreshEnd error', e); }
	};

	function sgFillDeviceTab() {
		var tabDiv = document.getElementById('serviceguardian');
		if (!tabDiv) return;

		// currentNode — глобальная переменная MeshCentral с данными выбранного
		// устройства. Если в вашей версии переменная называется иначе —
		// сообщите содержимое window.currentNode / meshserver.currentNode
		// из консоли, поправим.
		var node = (typeof currentNode !== 'undefined') ? currentNode : null;
		var nodeId = node && (node._id || node.nodeid || node.id);

		if (!nodeId) {
			tabDiv.innerHTML = '<p style="padding:16px; font-family:sans-serif; color:#888;">Не удалось определить ID этого устройства для Service Guardian.</p>';
			return;
		}

		// Из полного ID узла MeshCentral (вида "node//xxxxx") интересна только
		// часть после последнего "/" — она и есть то значение, что попадает
		// в gotonode= в адресной строке и хранится в ссылке агента на дашборде.
		var shortId = nodeId.indexOf('/') >= 0 ? nodeId.substring(nodeId.lastIndexOf('/') + 1) : nodeId;

		tabDiv.innerHTML = '<iframe id="sg-device-frame" style="width:100%; height:78vh; border:none;"></iframe>';
		document.getElementById('sg-device-frame').src = SG_DASHBOARD_URL + '/by-mesh/' + encodeURIComponent(shortId);
	}

	return obj;
}

// MeshCentral использует этот же файл двояко: на сервере через
// require(...)[shortName] (отсюда и была ошибка "is not a function" —
// без экспорта require() возвращал пустой объект), и в браузере, где
// объект "module" не существует — поэтому экспорт оборачиваем проверкой.
if (typeof module !== 'undefined' && module.exports) {
	module.exports.serviceguardian = serviceguardian;
}
