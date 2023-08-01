<script lang="ts">
	import '../app.css';
	import '../theme/theme.css';

	import '@material/web/button/elevated-button';
	import '@material/web/button/filled-button';
	import '@material/web/button/outlined-button';
	import '@material/web/button/text-button';
	import '@material/web/button/tonal-button';
	import '@material/web/dialog/dialog';
	import '@material/web/divider/divider';
	import '@material/web/icon/icon';
	import '@material/web/iconbutton/standard-icon-button';
	import '@material/web/progress/circular-progress';
	import '@material/web/progress/linear-progress';
	import '@material/web/ripple/ripple';
	import '@material/web/slider/slider';
	import '@material/web/switch/switch';
</script>

<svelte:head>
	<title>Solar API demo</title>
	<meta name="description" content="Solar API demo" />
</svelte:head>

<main class="surface on-surface-text body-medium flex flex-col w-screen h-screen">
	<slot />
</main>
