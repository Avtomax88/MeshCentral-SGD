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

function serviceguardian() {
	var obj = {};

	// ---------- Кнопка на главной странице (перед "My Server") ----------

	obj.onWebUIStartupEnd = function () {
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

		var leftbar = document.getElementById('page_leftbar');
		if (!leftbar) return;

		// Ищем существующий пункт "My Server", чтобы вставить кнопку перед
		// ним и скопировать его разметку/стили — так кнопка будет выглядеть
		// "родной", даже если мы не знаем точные CSS-классы заранее.
		var candidates = leftbar.querySelectorAll('div, li, a, span');
		var myServerItem = null;
		for (var i = 0; i < candidates.length; i++) {
			var el = candidates[i];
			if (el.children.length === 0 && el.textContent && el.textContent.trim() === 'My Server') {
				// Поднимаемся до кликабельного контейнера пункта меню (обычно
				// это ближайший родитель с onclick или ролью кнопки).
				var container = el;
				var hops = 0;
				while (container.parentElement && hops < 4 && !container.onclick && container.getAttribute('onclick') == null) {
					container = container.parentElement;
					hops++;
				}
				myServerItem = container;
				break;
			}
		}

		if (!myServerItem) {
			console.log('serviceguardian: пункт меню "My Server" не найден — сборка левого меню в этой версии MeshCentral отличается, кнопку добавить не удалось. Сообщите об этом с содержимым #page_leftbar из консоли.');
			return;
		}

		var btn = myServerItem.cloneNode(true);
		btn.id = 'sg-leftbar-btn';
		btn.removeAttribute('onclick');

		// Меняем текст на "Guardian" в самом глубоком текстовом узле.
		var walker = document.createTreeWalker(btn, NodeFilter.SHOW_TEXT, null);
		var textNode;
		while ((textNode = walker.nextNode())) {
			if (textNode.nodeValue.trim() === 'My Server') {
				textNode.nodeValue = textNode.nodeValue.replace('My Server', 'Guardian');
			}
		}

		btn.addEventListener('click', function (e) {
			e.preventDefault();
			e.stopPropagation();
			sgShowFrame(SG_DASHBOARD_URL + '/');
		}, true);

		myServerItem.parentNode.insertBefore(btn, myServerItem);
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
		return { tabId: 'serviceguardian', tabTitle: 'Guardian' };
	};

	obj.onDeviceRefreshEnd = function () {
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
