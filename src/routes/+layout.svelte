<script lang="ts">
	const sidebarWidth = {
		small: 300,
		large: 400
	};
</script>

<div class="sidebar" style="--width: {sidebarWidth.small}px">
	<a href="#">About</a>
	<a href="#">Services</a>
	<a href="#">Clients</a>
	<a href="#">Contact</a>
</div>

<div class="content" style="--width: {sidebarWidth.small}px">
	<slot />
</div>

<style>
	.sidebar {
		background-color: darkcyan;
		border: 5px solid green;

		height: 100%; /* Full-height: remove this if you want "auto" height */
		width: var(--width);
		position: fixed; /* Fixed Sidebar (stay in place on scroll) */
		z-index: 1; /* Stay on top */
		top: 0; /* Stay at the top */
		right: 0;
		background-color: #111; /* Black */
		overflow-x: hidden; /* Disable horizontal scroll */
		padding-top: 20px;
	}

	.content {
		background-color: brown;
		border: 20px solid blue;

		margin-left: var(--width); /* Same as the width of the sidebar */
		padding: 0px;
	}
</style>
