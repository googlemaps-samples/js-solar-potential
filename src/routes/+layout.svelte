<script lang="ts">
	import '../app.css';

	import '@material/web/iconbutton/standard-icon-button';
	import '@material/web/icon/icon';
</script>

<svelte:head>
	<title>Solar API demo</title>
	<meta name="description" content="Solar API demo" />
</svelte:head>

<main class="flex flex-col w-screen h-screen">
	<slot />
</main>
