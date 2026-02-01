// src/pages/EventSubmissionPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Link as LinkIcon, Upload, Loader2, CheckCircle2, AlertCircle, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { scrapeEventFromUrl } from '@/utils/eventLinkScraper';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const US_STATES = [
	'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA',
	'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK',
	'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

// ===== config =====
const EVENTS_TABLE = 'events';
const PENDING_EVENTS_TABLE = 'pending_events';

// Lookups (change if your table names differ)
const ARTISTS_TABLE = 'artists';
const VENUES_TABLE = 'venues';

// Pending lookup tables (change if your table names differ)
const PENDING_ARTISTS_TABLE = 'pending_artists';
const PENDING_VENUES_TABLE = 'pending_venues';

// Matches DB normalize_key style (lower + collapse whitespace + trim)
function normalizeKey(input) {
	return (input || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// for typeahead
const clean = (s = '') => String(s ?? '').trim();

function EventSubmissionPage() {
	const navigate = useNavigate();
	const { toast } = useToast();

	const [linkUrl, setLinkUrl] = useState('');
	const [scraping, setScraping] = useState(false);
	const [scrapeStatus, setScrapeStatus] = useState(null);

	const [uploadingImage, setUploadingImage] = useState(false);
	const [isDragging, setIsDragging] = useState(false);

	const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
	const [duplicateEvent, setDuplicateEvent] = useState(null);
	const [checkingDuplicates, setCheckingDuplicates] = useState(false);

	// ===== NEW: Artist/Venue lookup state =====
	const [artists, setArtists] = useState([]);
	const [venues, setVenues] = useState([]);
	const [lookupsLoading, setLookupsLoading] = useState(true);

	const [artistQuery, setArtistQuery] = useState('');
	const [venueQuery, setVenueQuery] = useState('');

	// selection can be approved OR pending
	// approved: { type:'approved', id, name }
	// pending:  { type:'pending', id, name }
	const [selectedArtist, setSelectedArtist] = useState(null);
	const [selectedVenue, setSelectedVenue] = useState(null);

	const [showAddArtistDialog, setShowAddArtistDialog] = useState(false);
	const [showAddVenueDialog, setShowAddVenueDialog] = useState(false);
	const [addingArtist, setAddingArtist] = useState(false);
	const [addingVenue, setAddingVenue] = useState(false);

	const [pendingArtistForm, setPendingArtistForm] = useState({
		name: '',
		genre: '',
		hometown: '',
		contact_email: '',
		bio: ''
	});

	const [pendingVenueForm, setPendingVenueForm] = useState({
		name: '',
		city: '',
		state: '',
		address: '',
		contact_email: '',
		capacity: ''
	});

	const [formData, setFormData] = useState({
		// NEW: artist_name stored for display + fallback
		artist_name: '',

		title: '',
		start_date: '',
		start_time: '',
		end_time: '',
		venue_name: '',
		address: '',
		city: '',
		state: '',
		postal_code: '',
		ticket_url: '',
		description: '',
		image_url: '',
	});

	const [submitting, setSubmitting] = useState(false);

	// ===== NEW: Load artists/venues once =====
	useEffect(() => {
		let cancelled = false;

		const loadLookups = async () => {
			setLookupsLoading(true);
			try {
				const [aRes, vRes] = await Promise.all([
					supabase.from(ARTISTS_TABLE).select('id,name').order('name', { ascending: true }),
					supabase.from(VENUES_TABLE).select('id,name,city,state,address').order('name', { ascending: true }),
				]);

				if (aRes.error) console.warn('[EventSubmissionPage] artists load error:', aRes.error);
				if (vRes.error) console.warn('[EventSubmissionPage] venues load error:', vRes.error);

				if (!cancelled) {
					setArtists(Array.isArray(aRes.data) ? aRes.data : []);
					setVenues(Array.isArray(vRes.data) ? vRes.data : []);
				}
			} catch (e) {
				console.warn('[EventSubmissionPage] lookups load failed:', e);
			} finally {
				if (!cancelled) setLookupsLoading(false);
			}
		};

		loadLookups();
		return () => { cancelled = true; };
	}, []);

	// ===== NEW: typeahead filtering =====
	const filteredArtists = useMemo(() => {
		const q = normalizeKey(artistQuery);
		if (!q) return artists.slice(0, 8);
		return artists.filter(a => normalizeKey(a.name).includes(q)).slice(0, 8);
	}, [artistQuery, artists]);

	const filteredVenues = useMemo(() => {
		const q = normalizeKey(venueQuery);
		if (!q) return venues.slice(0, 8);
		return venues.filter(v => normalizeKey(v.name).includes(q)).slice(0, 8);
	}, [venueQuery, venues]);

	const artistExactExists = useMemo(() => {
		const q = normalizeKey(artistQuery);
		if (!q) return true;
		return artists.some(a => normalizeKey(a.name) === q);
	}, [artistQuery, artists]);

	const venueExactExists = useMemo(() => {
		const q = normalizeKey(venueQuery);
		if (!q) return true;
		return venues.some(v => normalizeKey(v.name) === q);
	}, [venueQuery, venues]);

	const prettyDuplicateDate = useMemo(() => {
		try {
			if (!duplicateEvent?.start_datetime) return '';
			return new Date(duplicateEvent.start_datetime).toLocaleDateString();
		} catch {
			return '';
		}
	}, [duplicateEvent]);

	const handleScrapeUrl = async () => {
		if (!linkUrl.trim()) {
			toast({ variant: 'destructive', title: 'URL Required', description: 'Please enter a valid event URL' });
			return;
		}

		try {
			setScraping(true);
			setScrapeStatus(null);

			const scrapedData = await scrapeEventFromUrl(linkUrl);

			if (scrapedData && (Object.keys(scrapedData).length > 1 || scrapedData.title)) {
				let startDate = '';
				let startTime = '';

				if (scrapedData.start_datetime) {
					const dt = new Date(scrapedData.start_datetime);
					if (!Number.isNaN(dt.getTime())) {
						startDate = dt.toISOString().split('T')[0];
						startTime = dt.toTimeString().slice(0, 5);
					}
				}

				setFormData((prev) => ({
					...prev,
					...scrapedData,
					start_date: startDate || prev.start_date,
					start_time: startTime || prev.start_time,
					ticket_url: scrapedData.ticket_url || linkUrl,
				}));

				setScrapeStatus('success');
				toast({
					title: 'Data Extracted',
					description: 'We found some event details! Please review and fill in any missing fields.',
				});

				// If scraper returns venue_name, prefill venue query (does not force select)
				if (scrapedData?.venue_name) {
					setVenueQuery(scrapedData.venue_name);
				}
			} else {
				setScrapeStatus('error');
				setFormData((prev) => ({ ...prev, ticket_url: linkUrl }));
				toast({
					variant: 'destructive',
					title: 'Limited Extraction',
					description: "We couldn't automatically extract all details. Please fill out the form manually.",
				});
			}
		} catch (error) {
			console.error('Scraping error:', error);
			setScrapeStatus('error');
			toast({
				variant: 'destructive',
				title: 'Extraction Failed',
				description: 'Unable to extract event details. Please enter manually.',
			});
		} finally {
			setScraping(false);
		}
	};

	const processFile = async (file) => {
		if (!file) return;

		if (!file.type.startsWith('image/')) {
			toast({ variant: 'destructive', title: 'Invalid File', description: 'Please select an image file (PNG, JPG, GIF, WEBP).' });
			return;
		}

		if (file.size > 5 * 1024 * 1024) {
			toast({ variant: 'destructive', title: 'File too large', description: 'Image must be under 5MB.' });
			return;
		}

		setUploadingImage(true);
		try {
			const fileExt = file.name.split('.').pop();
			const userId = 'anonymous';
			const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

			const { error: uploadError } = await supabase.storage.from('event-images').upload(fileName, file);
			if (uploadError) throw uploadError;

			const { data: { publicUrl } } = supabase.storage.from('event-images').getPublicUrl(fileName);

			setFormData((prev) => ({ ...prev, image_url: publicUrl }));
			toast({ title: 'Image Uploaded', description: 'Event photo added successfully.' });
		} catch (error) {
			console.error('Error uploading image:', error);
			toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload image. Please try again.' });
		} finally {
			setUploadingImage(false);
		}
	};

	const handleImageUpload = (e) => {
		const file = e.target.files?.[0];
		if (file) {
			processFile(file);
			e.target.value = '';
		}
	};

	const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
	const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
	const handleDrop = (e) => {
		e.preventDefault();
		setIsDragging(false);
		const files = e.dataTransfer.files;
		if (files && files.length > 0) processFile(files[0]);
	};

	const removeImage = () => setFormData((prev) => ({ ...prev, image_url: '' }));

	/**
	 * Duplicate validation:
	 * - block duplicates already in APPROVED events
	 * - block duplicates already submitted in pending_events
	 * match: normalize(title)+normalize(venue_name)+same date (optionally city/state)
	 */
	const checkForDuplicates = async () => {
		const venueNorm = normalizeKey(formData.venue_name);
		const titleNorm = normalizeKey(formData.title);
		const date = (formData.start_date || '').trim();
		if (!venueNorm || !date || !titleNorm) return null;

		setCheckingDuplicates(true);
		try {
			const startOfDay = `${date}T00:00:00`;
			const endOfDay = `${date}T23:59:59`;

			const buildQuery = async (table) => {
				let q = supabase
					.from(table)
					.select('id, title, venue_name, city, state, start_datetime, description, image_url, ticket_url, status')
					.ilike('venue_name', formData.venue_name.trim())
					.gte('start_datetime', startOfDay)
					.lte('start_datetime', endOfDay);

				// only approved in events; only pending in pending_events
				if (table === EVENTS_TABLE) q = q.eq('status', 'approved');
				if (table === PENDING_EVENTS_TABLE) q = q.eq('status', 'pending');

				if ((formData.city || '').trim()) q = q.ilike('city', formData.city.trim());
				if ((formData.state || '').trim()) q = q.eq('state', (formData.state || '').trim().toUpperCase());

				return q;
			};

			const [eventsRes, pendingRes] = await Promise.all([
				buildQuery(EVENTS_TABLE),
				buildQuery(PENDING_EVENTS_TABLE),
			]);

			const eData = eventsRes?.data || [];
			const pData = pendingRes?.data || [];

			const rows = [...eData, ...pData];

			const match = rows.find((ev) => {
				const evTitle = normalizeKey(ev.title);
				const evVenue = normalizeKey(ev.venue_name);
				return evTitle === titleNorm && evVenue === venueNorm;
			});

			return match || null;
		} catch (err) {
			console.error('Unexpected error checking duplicates:', err);
			return null;
		} finally {
			setCheckingDuplicates(false);
		}
	};

	const handleDuplicateBlocked = async () => {
		toast({
			variant: 'destructive',
			title: 'Duplicate Event',
			description: 'This event is already listed (or already pending) at this venue on that date.',
		});

		try {
			const dupe = await checkForDuplicates();
			setDuplicateEvent(dupe || null);
		} finally {
			setShowDuplicateDialog(true);
		}
	};

	// ===== NEW: Create pending artist/venue =====
	const createPendingArtist = async () => {
		const name = clean(pendingArtistForm.name);
		if (!name) {
			toast({ variant: 'destructive', title: 'Artist name required', description: 'Enter an artist name.' });
			return;
		}

		setAddingArtist(true);
		try {
			const { data, error } = await supabase
				.from(PENDING_ARTISTS_TABLE)
				.insert([{
					name,
					genre: clean(pendingArtistForm.genre) || null,
					hometown: clean(pendingArtistForm.hometown) || null,
					contact_email: clean(pendingArtistForm.contact_email) || null,
					bio: clean(pendingArtistForm.bio) || null,
					status: 'pending',
					created_by: null,
				}])
				.select('id,name')
				.single();

			if (error) throw error;

			setSelectedArtist({ type: 'pending', id: data.id, name: data.name });
			setArtistQuery('');
			setFormData(prev => ({ ...prev, artist_name: data.name }));

			toast({ title: 'Artist submitted', description: 'Added to pending queue for approval.' });
			setShowAddArtistDialog(false);
		} catch (e) {
			console.error('[createPendingArtist] error:', e);
			toast({ variant: 'destructive', title: 'Failed to add artist', description: e?.message || 'Could not create pending artist.' });
		} finally {
			setAddingArtist(false);
		}
	};

	const createPendingVenue = async () => {
		const name = clean(pendingVenueForm.name);
		if (!name) {
			toast({ variant: 'destructive', title: 'Venue name required', description: 'Enter a venue name.' });
			return;
		}

		setAddingVenue(true);
		try {
			const capacityVal = clean(pendingVenueForm.capacity);
			const capacity = capacityVal ? parseInt(capacityVal, 10) : null;

			const { data, error } = await supabase
				.from(PENDING_VENUES_TABLE)
				.insert([{
					name,
					city: clean(pendingVenueForm.city) || null,
					state: clean(pendingVenueForm.state).toUpperCase() || null,
					address: clean(pendingVenueForm.address) || null,
					contact_email: clean(pendingVenueForm.contact_email) || null,
					capacity: Number.isFinite(capacity) ? capacity : null,
					status: 'pending',
					created_by: null,
				}])
				.select('id,name,city,state,address')
				.single();

			if (error) throw error;

			setSelectedVenue({ type: 'pending', id: data.id, name: data.name });
			setVenueQuery('');
			setFormData(prev => ({
				...prev,
				venue_name: data.name,
				city: data.city || prev.city,
				state: data.state || prev.state,
				address: data.address || prev.address,
			}));

			toast({ title: 'Venue submitted', description: 'Added to pending queue for approval.' });
			setShowAddVenueDialog(false);
		} catch (e) {
			console.error('[createPendingVenue] error:', e);
			toast({ variant: 'destructive', title: 'Failed to add venue', description: e?.message || 'Could not create pending venue.' });
		} finally {
			setAddingVenue(false);
		}
	};

	const executeSubmission = async () => {
		try {
			setSubmitting(true);
			setShowDuplicateDialog(false);

			const startDatetime = formData.start_time
				? `${formData.start_date}T${formData.start_time}:00`
				: `${formData.start_date}T00:00:00`;

			const endDatetime = formData.end_time
				? `${formData.start_date}T${formData.end_time}:00`
				: null;

			// IMPORTANT: write to pending_events, NOT events.
			// NEW: attach artist/venue IDs if present (safe even if columns don't exist—BUT will error if your table lacks them)
			const pendingPayload = {
				title: formData.title,
				start_datetime: startDatetime,
				end_datetime: endDatetime,

				// Artist (text fallback)
				artist_name: clean(formData.artist_name) || null,

				// Optional IDs (comment out if your pending_events does NOT have these columns)
				artist_id: selectedArtist?.type === 'approved' ? selectedArtist.id : null,
				pending_artist_id: selectedArtist?.type === 'pending' ? selectedArtist.id : null,

				venue_name: formData.venue_name,
				venue_id: selectedVenue?.type === 'approved' ? selectedVenue.id : null,
				pending_venue_id: selectedVenue?.type === 'pending' ? selectedVenue.id : null,

				address: formData.address || null,
				city: formData.city,
				state: (formData.state || '').toUpperCase(),
				postal_code: formData.postal_code || null,

				description: formData.description || null,
				ticket_url: formData.ticket_url || null,
				image_url: formData.image_url || null,

				source_type: linkUrl ? 'link' : 'manual',
				source_url: linkUrl || null,

				status: 'pending',
				created_by: null,
			};

			// If your pending_events table doesn't yet have artist_id/pending_artist_id/venue_id/pending_venue_id,
			// Supabase will throw "column does not exist". In that case, comment those 4 keys out above.

			const { error: insertError } = await supabase.from(PENDING_EVENTS_TABLE).insert([pendingPayload]);
			if (insertError) {
				if (insertError.code === '23505') {
					await handleDuplicateBlocked();
					return;
				}
				throw insertError;
			}

			toast({
				title: 'Submission Received',
				description: 'Thanks! Your event was submitted and is pending admin review.',
			});

			setTimeout(() => navigate('/fans'), 1500);
		} catch (error) {
			console.error('Submission error:', error);
			toast({
				variant: 'destructive',
				title: 'Submission Failed',
				description: error?.message || 'Failed to submit event. Please try again.',
			});
		} finally {
			setSubmitting(false);
		}
	};

	const handleFormSubmit = async (e) => {
		e.preventDefault();

		if (!formData.title) return toast({ variant: 'destructive', title: 'Missing Title', description: 'Please enter an event title.' });
		if (!formData.start_date) return toast({ variant: 'destructive', title: 'Missing Date', description: 'Please enter a start date.' });

		// NEW: artist required (optional—remove if you want it optional)
		if (!clean(formData.artist_name)) return toast({ variant: 'destructive', title: 'Missing Artist', description: 'Please choose or enter an artist.' });

		if (!formData.venue_name) return toast({ variant: 'destructive', title: 'Missing Venue', description: 'Please enter a venue name.' });
		if (!formData.city || !formData.state) return toast({ variant: 'destructive', title: 'Missing Location', description: 'Please enter city and state.' });

		const duplicate = await checkForDuplicates();
		if (duplicate) {
			setDuplicateEvent(duplicate);
			setShowDuplicateDialog(true);
			toast({ variant: 'destructive', title: 'Duplicate Event', description: 'This event already exists (or is already pending).' });
			return;
		}

		executeSubmission();
	};

	return (
		<>
			<Helmet>
				<title>Submit an Event - Black Label Entertainment</title>
				<meta name="description" content="Submit a live event or concert to our directory" />
			</Helmet>

			<div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] via-[#2a2a2a] to-[#1a1a1a]">
				<div className="max-w-3xl mx-auto px-6 py-16">
					<motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
						<Button onClick={() => navigate('/fans')} variant="ghost" className="mb-6 text-[#D4AF37] hover:text-[#f4d03f] hover:bg-[#D4AF37]/10">
							<ArrowLeft className="w-4 h-4 mr-2" />
							Back
						</Button>

						<h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-[#D4AF37] to-[#f4d03f] bg-clip-text text-transparent">
							Submit an Event
						</h1>
						<p className="text-gray-400 mb-8">Paste a link to auto-fill details, or enter them manually. All submissions are reviewed.</p>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
						className="bg-white/5 backdrop-blur-lg rounded-xl p-8 border border-[#D4AF37]/20"
					>
						{/* Link Input Section */}
						<div className="mb-8 p-6 bg-black/40 rounded-xl border border-gray-800">
							<label className="block text-sm font-medium text-[#D4AF37] mb-2 flex items-center gap-2">
								<LinkIcon className="w-4 h-4" />
								Import from URL
							</label>
							<div className="flex gap-3">
								<input
									type="url"
									value={linkUrl}
									onChange={(e) => setLinkUrl(e.target.value)}
									placeholder="Paste Ticketmaster, Eventbrite, or Bandsintown link..."
									className="flex-1 bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
								/>
								<Button
									onClick={handleScrapeUrl}
									disabled={scraping || !linkUrl.trim()}
									className="bg-[#D4AF37] hover:bg-[#f4d03f] text-black font-semibold min-w-[100px]"
								>
									{scraping ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Auto-Fill'}
								</Button>
							</div>

							<AnimatePresence>
								{scrapeStatus === 'success' && (
									<motion.div
										initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
										className="flex items-center gap-2 mt-3 text-green-400 text-sm"
									>
										<CheckCircle2 className="w-4 h-4" />
										<span>Success! details extracted. Please review the form below.</span>
									</motion.div>
								)}
								{scrapeStatus === 'error' && (
									<motion.div
										initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
										className="flex items-center gap-2 mt-3 text-amber-400 text-sm"
									>
										<AlertCircle className="w-4 h-4" />
										<span>Could not extract all details. Please fill in the missing fields manually.</span>
									</motion.div>
								)}
							</AnimatePresence>
						</div>

						<div className="border-t border-gray-800 my-8"></div>

						<h2 className="text-xl font-semibold text-white mb-6">Event Details</h2>

						<form onSubmit={handleFormSubmit} className="space-y-6">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">

								{/* ===== NEW: ARTIST FIELD (typeahead + add pending) ===== */}
								<div className="md:col-span-2">
									<label className="block text-sm font-medium text-gray-300 mb-2">
										Artist <span className="text-gray-500 font-normal">(search & select)</span>
									</label>

									<input
										type="text"
										value={selectedArtist?.name ?? artistQuery}
										onChange={(e) => {
											setArtistQuery(e.target.value);
											setSelectedArtist(null);
											setFormData(prev => ({ ...prev, artist_name: e.target.value }));
										}}
										className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
										placeholder={lookupsLoading ? 'Loading artists…' : 'Start typing an artist…'}
									/>

									{(!selectedArtist && clean(artistQuery)) && (
										<div className="mt-2 border border-gray-700 rounded-lg bg-[#121212] overflow-hidden">
											{filteredArtists.map(a => (
												<button
													key={a.id}
													type="button"
													className="w-full text-left px-4 py-2 hover:bg-white/5 text-white"
													onClick={() => {
														setSelectedArtist({ type: 'approved', id: a.id, name: a.name });
														setArtistQuery(a.name);
														setFormData(prev => ({ ...prev, artist_name: a.name }));
													}}
												>
													{a.name}
												</button>
											))}

											{!artistExactExists && clean(artistQuery).length > 1 && (
												<button
													type="button"
													className="w-full text-left px-4 py-2 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] flex items-center gap-2"
													onClick={() => {
														setPendingArtistForm({ name: clean(artistQuery), genre: '', hometown: '', contact_email: '', bio: '' });
														setShowAddArtistDialog(true);
													}}
												>
													<Plus className="w-4 h-4" />
													Add “{clean(artistQuery)}” (pending approval)
												</button>
											)}
										</div>
									)}

									{!!selectedArtist && selectedArtist.type === 'pending' && (
										<p className="mt-2 text-xs text-amber-300">
											Pending artist selected — this will show up after admin approval.
										</p>
									)}
								</div>

								<div className="md:col-span-2">
									<label className="block text-sm font-medium text-gray-300 mb-2">Event Title</label>
									<input
										type="text"
										value={formData.title}
										onChange={(e) => setFormData({ ...formData, title: e.target.value })}
										className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
										placeholder="Band Name or Event Title"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
									<input
										type="date"
										value={formData.start_date}
										onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
										className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-300 mb-2">Start Time</label>
									<input
										type="time"
										value={formData.start_time}
										onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
										className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
									/>
								</div>

								{/* ===== UPDATED: VENUE FIELD (typeahead + add pending) ===== */}
								<div className="md:col-span-2">
									<label className="block text-sm font-medium text-gray-300 mb-2">
										Venue <span className="text-gray-500 font-normal">(search & select)</span>
									</label>

									<input
										type="text"
										value={selectedVenue?.name ?? venueQuery}
										onChange={(e) => {
											const val = e.target.value;
											setVenueQuery(val);
											setSelectedVenue(null);
											setFormData(prev => ({ ...prev, venue_name: val }));
										}}
										className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
										placeholder={lookupsLoading ? 'Loading venues…' : 'Start typing a venue…'}
									/>

									{(!selectedVenue && clean(venueQuery)) && (
										<div className="mt-2 border border-gray-700 rounded-lg bg-[#121212] overflow-hidden">
											{filteredVenues.map(v => (
												<button
													key={v.id}
													type="button"
													className="w-full text-left px-4 py-2 hover:bg-white/5 text-white"
													onClick={() => {
														setSelectedVenue({ type: 'approved', id: v.id, name: v.name });
														setVenueQuery(v.name);
														setFormData(prev => ({
															...prev,
															venue_name: v.name,
															city: v.city || prev.city,
															state: v.state || prev.state,
															address: v.address || prev.address
														}));
													}}
												>
													<div className="flex items-center justify-between gap-3">
														<span>{v.name}</span>
														<span className="text-xs text-gray-400">
															{v.city || v.state ? `${v.city || ''}${v.city && v.state ? ', ' : ''}${v.state || ''}` : ''}
														</span>
													</div>
												</button>
											))}

											{!venueExactExists && clean(venueQuery).length > 1 && (
												<button
													type="button"
													className="w-full text-left px-4 py-2 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] flex items-center gap-2"
													onClick={() => {
														setPendingVenueForm({
															name: clean(venueQuery),
															city: formData.city || '',
															state: (formData.state || '').toUpperCase(),
															address: formData.address || '',
															contact_email: '',
															capacity: ''
														});
														setShowAddVenueDialog(true);
													}}
												>
													<Plus className="w-4 h-4" />
													Add “{clean(venueQuery)}” (pending approval)
												</button>
											)}
										</div>
									)}

									{!!selectedVenue && selectedVenue.type === 'pending' && (
										<p className="mt-2 text-xs text-amber-300">
											Pending venue selected — this will show up after admin approval.
										</p>
									)}
								</div>

								<div className="md:col-span-2">
									<label className="block text-sm font-medium text-gray-300 mb-2">Street Address</label>
									<input
										type="text"
										value={formData.address}
										onChange={(e) => setFormData({ ...formData, address: e.target.value })}
										className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-300 mb-2">City</label>
									<input
										type="text"
										value={formData.city}
										onChange={(e) => setFormData({ ...formData, city: e.target.value })}
										className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-300 mb-2">State</label>
									<select
										value={formData.state}
										onChange={(e) => setFormData({ ...formData, state: e.target.value })}
										className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
									>
										<option value="" className="bg-[#1a1a1a]">Select State</option>
										{US_STATES.map((s) => (
											<option key={s} value={s} className="bg-[#1a1a1a]">{s}</option>
										))}
									</select>
								</div>

								<div className="md:col-span-2">
									<label className="block text-sm font-medium text-gray-300 mb-2">Ticket URL</label>
									<input
										type="url"
										value={formData.ticket_url}
										onChange={(e) => setFormData({ ...formData, ticket_url: e.target.value })}
										className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
										placeholder="https://..."
									/>
								</div>

								<div className="md:col-span-2">
									<label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
									<textarea
										value={formData.description}
										onChange={(e) => setFormData({ ...formData, description: e.target.value })}
										rows={4}
										className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37] resize-none"
										placeholder="Event details, lineup, etc."
									/>
								</div>

								<div className="md:col-span-2">
									<label className="block text-sm font-medium text-gray-300 mb-2">
										Event Photo <span className="text-gray-500 font-normal">(Optional)</span>
									</label>

									{!formData.image_url ? (
										<div
											className={cn(
												"mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition-colors bg-black/20",
												isDragging ? "border-[#D4AF37] bg-[#D4AF37]/10" : "border-gray-700 hover:border-[#D4AF37]"
											)}
											onDragOver={handleDragOver}
											onDragLeave={handleDragLeave}
											onDrop={handleDrop}
										>
											<div className="space-y-1 text-center">
												{uploadingImage ? (
													<div className="flex flex-col items-center p-4">
														<Loader2 className="w-8 h-8 animate-spin text-[#D4AF37] mb-2" />
														<p className="text-sm text-gray-400">Uploading...</p>
													</div>
												) : (
													<>
														<Upload className={cn("mx-auto h-12 w-12", isDragging ? "text-[#D4AF37]" : "text-gray-400")} />
														<div className="flex text-sm text-gray-400 justify-center">
															<label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-[#D4AF37] hover:text-[#f4d03f] focus-within:outline-none">
																<span>Upload a file</span>
																<input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageUpload} />
															</label>
															<p className="pl-1">or drag and drop</p>
														</div>
														<p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
													</>
												)}
											</div>
										</div>
									) : (
										<div className="relative mt-2 w-full h-64 bg-black/40 rounded-lg overflow-hidden border border-gray-700 group">
											<img src={formData.image_url} alt="Event preview" className="w-full h-full object-cover" />
											<div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
												<Button type="button" variant="destructive" size="sm" onClick={removeImage} className="flex items-center gap-2">
													<X className="w-4 h-4" /> Remove Photo
												</Button>
											</div>
										</div>
									)}
								</div>
							</div>

							<Button
								type="submit"
								disabled={submitting || checkingDuplicates}
								className="w-full bg-gradient-to-r from-[#D4AF37] to-[#f4d03f] hover:from-[#f4d03f] hover:to-[#D4AF37] text-black font-bold py-4 shadow-lg hover:shadow-2xl transition-all duration-300"
							>
								{submitting || checkingDuplicates ? (
									<>
										<Loader2 className="w-5 h-5 mr-2 animate-spin" />
										{checkingDuplicates ? 'Checking...' : 'Submitting...'}
									</>
								) : (
									'Submit Event'
								)}
							</Button>
						</form>
					</motion.div>
				</div>

				{/* Duplicate Event Dialog */}
				<Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
					<DialogContent className="bg-[#1a1a1a] border border-gray-800 text-white sm:max-w-md">
						<DialogHeader>
							<DialogTitle className="text-[#D4AF37] flex items-center gap-2">
								<AlertCircle className="w-5 h-5" />
								Duplicate Event Found
							</DialogTitle>
						</DialogHeader>

						<div className="py-4">
							<p className="text-sm text-gray-400 mb-4">
								<strong>{formData.title}</strong> at <strong>{duplicateEvent?.venue_name || formData.venue_name}</strong>
								{duplicateEvent?.city ? <> in {duplicateEvent.city}</> : (formData.city ? <> in {formData.city}</> : null)}
								{duplicateEvent?.state ? <> , {duplicateEvent.state}</> : (formData.state ? <> , {formData.state}</> : null)}
								{prettyDuplicateDate ? <> on {prettyDuplicateDate}</> : null}
								{' '}already exists (or is already pending).
							</p>

							{duplicateEvent ? (
								<div className="bg-black/40 p-4 rounded-lg border border-gray-700">
									<h4 className="font-semibold text-white">{duplicateEvent.title}</h4>
									<p className="text-sm text-gray-400 mt-1 line-clamp-2">{duplicateEvent.description || 'No description'}</p>
								</div>
							) : (
								<div className="bg-black/40 p-4 rounded-lg border border-gray-700">
									<p className="text-sm text-gray-400">We blocked a duplicate submission, but couldn’t load the existing entry details.</p>
								</div>
							)}
						</div>

						<DialogFooter className="sm:justify-between">
							<Button variant="ghost" onClick={() => setShowDuplicateDialog(false)} className="text-gray-400 hover:text-white">
								Close
							</Button>

							<Button
								type="button"
								onClick={() => {
									setShowDuplicateDialog(false);
									toast({ title: 'Duplicate blocked', description: 'This entry already exists (or is already pending). Try submitting a different event.' });
								}}
								className="bg-[#D4AF37] hover:bg-[#f4d03f] text-black"
							>
								Ok
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				{/* ===== NEW: Add Pending Artist Dialog ===== */}
				<Dialog open={showAddArtistDialog} onOpenChange={setShowAddArtistDialog}>
					<DialogContent className="bg-[#1a1a1a] border border-gray-800 text-white sm:max-w-md">
						<DialogHeader>
							<DialogTitle className="text-[#D4AF37]">Add Artist (Pending Approval)</DialogTitle>
						</DialogHeader>

						<div className="space-y-3">
							<div>
								<label className="block text-xs text-gray-400 mb-1">Artist Name</label>
								<input
									className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
									value={pendingArtistForm.name}
									onChange={(e) => setPendingArtistForm(p => ({ ...p, name: e.target.value }))}
									placeholder="e.g. Klincher"
								/>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-xs text-gray-400 mb-1">Genre (optional)</label>
									<input
										className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
										value={pendingArtistForm.genre}
										onChange={(e) => setPendingArtistForm(p => ({ ...p, genre: e.target.value }))}
										placeholder="Rock"
									/>
								</div>
								<div>
									<label className="block text-xs text-gray-400 mb-1">Hometown (optional)</label>
									<input
										className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
										value={pendingArtistForm.hometown}
										onChange={(e) => setPendingArtistForm(p => ({ ...p, hometown: e.target.value }))}
										placeholder="St. Louis, MO"
									/>
								</div>
							</div>

							<div>
								<label className="block text-xs text-gray-400 mb-1">Contact Email (optional)</label>
								<input
									type="email"
									className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
									value={pendingArtistForm.contact_email}
									onChange={(e) => setPendingArtistForm(p => ({ ...p, contact_email: e.target.value }))}
									placeholder="booking@artist.com"
								/>
							</div>

							<div>
								<label className="block text-xs text-gray-400 mb-1">Bio (optional)</label>
								<textarea
									rows={3}
									className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37] resize-none"
									value={pendingArtistForm.bio}
									onChange={(e) => setPendingArtistForm(p => ({ ...p, bio: e.target.value }))}
									placeholder="Short bio…"
								/>
							</div>

							<p className="text-xs text-gray-500">
								This creates a record in <code className="text-gray-300">{PENDING_ARTISTS_TABLE}</code> for admin review.
							</p>
						</div>

						<DialogFooter className="sm:justify-between">
							<Button variant="ghost" onClick={() => setShowAddArtistDialog(false)} className="text-gray-400 hover:text-white">
								Cancel
							</Button>
							<Button
								onClick={createPendingArtist}
								disabled={addingArtist}
								className="bg-[#D4AF37] hover:bg-[#f4d03f] text-black"
							>
								{addingArtist ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit'}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				{/* ===== NEW: Add Pending Venue Dialog ===== */}
				<Dialog open={showAddVenueDialog} onOpenChange={setShowAddVenueDialog}>
					<DialogContent className="bg-[#1a1a1a] border border-gray-800 text-white sm:max-w-md">
						<DialogHeader>
							<DialogTitle className="text-[#D4AF37]">Add Venue (Pending Approval)</DialogTitle>
						</DialogHeader>

						<div className="space-y-3">
							<div>
								<label className="block text-xs text-gray-400 mb-1">Venue Name</label>
								<input
									className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
									value={pendingVenueForm.name}
									onChange={(e) => setPendingVenueForm(p => ({ ...p, name: e.target.value }))}
									placeholder="e.g. House of Blues"
								/>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-xs text-gray-400 mb-1">City</label>
									<input
										className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
										value={pendingVenueForm.city}
										onChange={(e) => setPendingVenueForm(p => ({ ...p, city: e.target.value }))}
										placeholder="City"
									/>
								</div>
								<div>
									<label className="block text-xs text-gray-400 mb-1">State</label>
									<input
										className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
										value={pendingVenueForm.state}
										onChange={(e) => setPendingVenueForm(p => ({ ...p, state: e.target.value.toUpperCase() }))}
										placeholder="IL"
										maxLength={2}
									/>
								</div>
							</div>

							<div>
								<label className="block text-xs text-gray-400 mb-1">Address (optional)</label>
								<input
									className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
									value={pendingVenueForm.address}
									onChange={(e) => setPendingVenueForm(p => ({ ...p, address: e.target.value }))}
									placeholder="123 Main St"
								/>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-xs text-gray-400 mb-1">Contact Email (optional)</label>
									<input
										type="email"
										className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
										value={pendingVenueForm.contact_email}
										onChange={(e) => setPendingVenueForm(p => ({ ...p, contact_email: e.target.value }))}
										placeholder="info@venue.com"
									/>
								</div>
								<div>
									<label className="block text-xs text-gray-400 mb-1">Capacity (optional)</label>
									<input
										inputMode="numeric"
										className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
										value={pendingVenueForm.capacity}
										onChange={(e) => setPendingVenueForm(p => ({ ...p, capacity: e.target.value }))}
										placeholder="800"
									/>
								</div>
							</div>

							<p className="text-xs text-gray-500">
								This creates a record in <code className="text-gray-300">{PENDING_VENUES_TABLE}</code> for admin review.
							</p>
						</div>

						<DialogFooter className="sm:justify-between">
							<Button variant="ghost" onClick={() => setShowAddVenueDialog(false)} className="text-gray-400 hover:text-white">
								Cancel
							</Button>
							<Button
								onClick={createPendingVenue}
								disabled={addingVenue}
								className="bg-[#D4AF37] hover:bg-[#f4d03f] text-black"
							>
								{addingVenue ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit'}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>
		</>
	);
}

export default EventSubmissionPage;
