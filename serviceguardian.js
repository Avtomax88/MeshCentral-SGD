// Service Guardian Dashboard — плагин для MeshCentral.
//
// ВАЖНО (выяснено экспериментально): MeshCentral вытаскивает и выполняет
// в браузере ТОЛЬКО код функций, перечисленных в obj.exports — вообще
// ничего больше из этого файла в браузер не попадает. Поэтому каждая
// функция-хук здесь полностью самодостаточна.
//
// Встраивание дашборда в <iframe> работает только потому, что в config.json
// MeshCentral добавлен кастомный заголовок httpHeaders → Content-Security-Policy
// с explicit добавлением домена дашборда в frame-src — без этого MeshCentral
// сам блокирует встраивание любых сторонних доменов в свой интерфейс.

function serviceguardian() {
	var obj = {};

	obj.exports = ['onWebUIStartupEnd', 'goPageEnd', 'onDeviceRefreshEnd'];

	// ---------- Кнопка на главной странице (перед "My Server") ----------

	obj.onWebUIStartupEnd = function () {
		console.log('serviceguardian: onWebUIStartupEnd сработал');
		try {
			// Оверлей с iframe на весь экран — определяем как свойство window
			// один раз здесь же, чтобы обработчик клика на кнопке (ниже) мог
			// его найти в любой момент в будущем.
			window.sgShowFrame = function (url) {
				var existing = document.getElementById('sg-frame-overlay');
				if (existing) {
					existing.style.display = 'flex';
					existing.querySelector('iframe').src = url;
					window.sgPositionFrame();
					return;
				}
				var overlay = document.createElement('div');
				overlay.id = 'sg-frame-overlay';
				overlay.style.cssText = 'position:fixed; z-index:100000; background:#0b0e14; display:flex; flex-direction:column;';

				var bar = document.createElement('div');
				bar.style.cssText = 'flex:0 0 auto; padding:10px 16px; background:#131722; border-bottom:1px solid #232a3a; display:flex; align-items:center; justify-content:space-between; font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;';
				bar.innerHTML = '<span style="color:#e7eaf0; font-weight:600;">Service Guardian Dashboard</span>';

				var closeBtn = document.createElement('button');
				closeBtn.textContent = '\u2715 Закрыть';
				closeBtn.style.cssText = 'background:#171c29; color:#8891a3; border:1px solid #232a3a; border-radius:6px; padding:6px 14px; cursor:pointer; font-size:13px;';
				closeBtn.onclick = function () { overlay.style.display = 'none'; };
				bar.appendChild(closeBtn);

				var iframe = document.createElement('iframe');
				iframe.src = url;
				iframe.style.cssText = 'flex:1 1 auto; border:none; width:100%;';

				overlay.appendChild(bar);
				overlay.appendChild(iframe);
				document.body.appendChild(overlay);
				window.sgPositionFrame();
				window.addEventListener('resize', window.sgPositionFrame);
			};

			// Вычисляет границы рабочей области MeshCentral (правее левой
			// иконочной панели, ниже верхней синей плашки) и подгоняет под
			// них оверлей — вместо того чтобы занимать весь экран поверх
			// всего интерфейса.
			window.sgPositionFrame = function () {
				var overlay = document.getElementById('sg-frame-overlay');
				var leftbar = document.getElementById('page_leftbar');
				if (!overlay) return;

				var top = 0, left = 0;
				if (leftbar) {
					var rect = leftbar.getBoundingClientRect();
					top = Math.round(rect.top);
					left = Math.round(rect.right);
				}
				overlay.style.top = top + 'px';
				overlay.style.left = left + 'px';
				overlay.style.right = '0';
				overlay.style.bottom = '0';
			};

			window.sgAddLeftbarButton = function () {
				if (document.getElementById('sg-leftbar-btn')) return; // уже добавлена

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

				btn.innerHTML = '<svg viewBox="0 0 32 32" width="35" height="35" style="display:block;margin:0 auto" xmlns="http://www.w3.org/2000/svg">'
					+ '<path d="M16 3 L27 7 V16 C27 22.5 22 27.5 16 29 C10 27.5 5 22.5 5 16 V7 Z" fill="currentColor"/>'
					+ '<path d="M11 16.5 L14.3 19.8 L21 12.5" stroke="#0b0e14" stroke-width="2.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
					+ '</svg>';

				btn.addEventListener('click', function (e) {
					e.preventDefault();
					e.stopPropagation();
					window.sgShowFrame('https://sgd.supporthound.ru/');
				}, true);

				myServerItem.parentNode.insertBefore(btn, myServerItem);
				console.log('serviceguardian: кнопка добавлена в левое меню');
			};

			window.sgAddLeftbarButton();
		} catch (e) { console.log('serviceguardian: onWebUIStartupEnd error', e); }
	};

	// goPageEnd — при смене страницы левое меню может перерисоваться;
	// window.sgAddLeftbarButton к этому моменту уже определена (её создаёт
	// onWebUIStartupEnd при первом же старте страницы).
	obj.goPageEnd = function () {
		try { if (window.sgAddLeftbarButton) window.sgAddLeftbarButton(); } catch (e) { /* тихо игнорируем */ }
	};

	// ---------- Вкладка на странице устройства ----------

	// registerPluginTab — это готовый метод самого pluginHandler (нужно его
	// ПОЗВАТЬ), а не хук, который framework сам ищет по имени — этим и
	// объяснялось, почему вкладка не появлялась раньше. Вызываем его прямо
	// внутри onDeviceRefreshEnd, куда MeshCentral и так передаёт nodeid
	// первым аргументом (надёжнее, чем читать глобальную currentNode).
	obj.onDeviceRefreshEnd = function (nodeid, panel, refresh, event) {
		console.log('serviceguardian: onDeviceRefreshEnd сработал, nodeid=', nodeid);
		try {
			pluginHandler.registerPluginTab({ tabId: 'serviceguardian', tabTitle: 'Guardian' });
		} catch (e) { console.log('serviceguardian: registerPluginTab error', e); }

		try {
			var tabDiv = document.getElementById('serviceguardian');
			if (!tabDiv) return;

			if (!nodeid) {
				tabDiv.innerHTML = '<p style="padding:16px; font-family:sans-serif; color:#888;">Не удалось определить ID этого устройства для Service Guardian.</p>';
				return;
			}

			var shortId = nodeid.indexOf('/') >= 0 ? nodeid.substring(nodeid.lastIndexOf('/') + 1) : nodeid;

			tabDiv.innerHTML = '<iframe id="sg-device-frame" style="width:100%; height:78vh; border:none;"></iframe>';
			document.getElementById('sg-device-frame').src = 'https://sgd.supporthound.ru/by-mesh/' + encodeURIComponent(shortId);
		} catch (e) { console.log('serviceguardian: onDeviceRefreshEnd error', e); }
	};

	return obj;
}

// На сервере (Node.js) "module" существует — экспортируем функцию под
// именем shortName, как того требует require(...)[plugin.shortName].
if (typeof module !== 'undefined' && module.exports) {
	module.exports.serviceguardian = serviceguardian;
}
