export type Locale = 'en' | 'es';

export const translations = {
  en: {
    // Locale meta
    code: 'en',
    label: 'English (US)',
    short: 'EN',
    flag: '🇺🇸',
    language: 'Language',

    // Login
    welcome: 'Welcome back',
    subtitle: 'Sign in to continue.',
    email: 'Email',
    emailPh: 'you@email.com',
    password: 'Password',
    passwordPh: 'Enter your password',
    show: 'Show',
    hide: 'Hide',
    remember: 'Remember me',
    forgot: 'Forgot password?',
    signIn: 'Sign in',
    signingIn: 'Signing in…',
    welcomeBack: '✓ Welcome back!',
    or: 'or',
    create: 'Create new account',
    terms: 'Terms',
    privacy: 'Privacy Policy',
    err: 'Invalid email or password.',
    errHint: 'Check your details or reset your password.',
    // Forgot / reset password flow (en).
    forgotTitle: 'Forgot your password?',
    forgotSubtitle:
      "Enter your account email and we'll send you a link to reset it.",
    forgotSubmit: 'Send reset link',
    forgotSending: 'Sending…',
    forgotBackToLogin: 'Back to sign in',
    forgotSentTitle: 'Check your email',
    forgotSentBody:
      "If an account exists for that email, we've sent a password reset link. It expires in 1 hour.",
    resetTitle: 'Choose a new password',
    resetSubtitle:
      'Your new password must be at least 8 characters and include uppercase, lowercase, and a number or symbol.',
    resetNewPassword: 'New password',
    resetSubmit: 'Reset password',
    resetSubmitting: 'Resetting…',
    resetTokenInvalid:
      'This reset link is invalid or has expired. Please request a new one.',
    resetDoneTitle: 'Password reset',
    resetDoneBody:
      'Your password has been updated. Redirecting you to sign in…',
    resetGoToLogin: 'Sign in now',

    errAccountNotActive:
      'Your account is not active. Please contact your administrator.',
    errAccountLocked:
      'Account temporarily locked due to too many failed attempts. Try again in about {minutes} minute(s).',
    errRateLimited:
      'Too many attempts. Please wait {seconds} seconds and try again.',
    errRateLimitedShort: 'Please wait before trying again.',
    errEmailExists: 'This email is already registered.',
    errGeneric: 'Something went wrong. Please try again.',
    noAccount: "Don't have an account?",
    requestDemo: 'Request a demo →',

    // Brand / hero side
    forFamilies: 'FOR DIRECTORS, STAFF AND FAMILIES',
    heroA: 'Total control.',
    heroB: 'Complete peace.',
    heroP: 'The all-in-one platform to run your daycare: attendance, daily reports, family communication and billing — all in one place.',
    todayInSteps: 'TODAY AT LITTLE STEPS',
    live: 'live',
    daycare: 'DAYCARES · SaaS',

    // Signup
    heading: 'Create your account',
    sub: 'Join us in minutes.',
    confirmPassword: 'Confirm password',
    confirmPh: 'Repeat password',
    confirmErr: "Passwords don't match.",
    firstName: 'First name (optional)',
    firstNamePh: 'John',
    lastName: 'Last name (optional)',
    lastNamePh: 'Doe',
    roleLabel: 'I am a…',
    roleDirector: 'Director',
    roleStaff: 'Staff',
    roleParent: 'Parent',
    strengthWeak: 'Weak',
    strengthMed: 'Medium',
    strengthStrong: 'Strong',
    reqLength: 'At least 8 characters',
    reqUpper: 'One uppercase letter',
    reqNumber: 'One number',
    createAccount: 'Create account',
    creating: 'Creating account…',
    hasAccount: 'Already have an account?',
    signInLink: 'Sign in',
    emailExists: 'Email already exists.',

    // Centers (nested namespace, accessed via t('centers.title') etc.)
    centers: {
      title: 'Centers',
      titleSingular: 'Center',
      create: 'Create center',
      edit: 'Edit center',
      delete: 'Close center',
      view: 'View details',
      list: 'All centers',
      noCenters: 'No centers yet',
      createFirst: 'Create your first center to get started',
      noCenterAssigned: 'No center assigned',
      contactAdmin:
        "You don't have a center assigned yet. Please contact your daycare administrator.",

      name: 'Center name',
      namePlaceholder: 'e.g., Sunny Days Daycare',
      street: 'Street',
      streetPlaceholder: '123 Main Street',
      city: 'City',
      cityPlaceholder: 'San Francisco',
      state: 'State',
      statePlaceholder: 'CA',
      zipCode: 'ZIP code',
      zipCodePlaceholder: '94102',
      phone: 'Phone',
      phonePlaceholder: '(415) 555-1234',
      email: 'Email',
      emailPlaceholder: 'contact@center.com',
      website: 'Website (optional)',
      websitePlaceholder: 'https://www.example.com',
      capacity: 'Maximum capacity',
      capacityPlaceholder: 'Maximum children',
      timezone: 'Timezone',
      timezoneAutoDetected: 'Auto-detected from ZIP',
      licenseNumber: 'License number (optional)',
      licenseNumberPlaceholder: '073409566',
      fieldRequired: 'required',

      save: 'Save center',
      saving: 'Saving…',
      cancel: 'Cancel',
      noChangesHint: 'No changes to save',
      confirmDelete: 'Close {name}?',
      deleteWarning:
        'This center will be marked as CLOSED. Children with active enrollment must be withdrawn first.',

      adminActions: 'Admin actions',
      changeStatus: 'Change status',
      currentStatus: 'Current',
      confirmStatusChange: 'Change status?',
      confirmStatusChangeDescription:
        'Status will go from "{from}" to "{to}". This may affect access for staff and parents.',
      confirmStatusChangeBtn: 'Change status',
      statusChangedToast: 'Status updated',
      statusChangeError: 'Could not change status',
      deletedToast: 'Center closed',

      createSuccess: 'Center created',
      updateSuccess: 'Center updated',
      deleteSuccess: 'Center closed',
      createdToast: 'Center created successfully',
      updatedToast: 'Changes saved successfully',
      unsavedChangesPrompt:
        'You have unsaved changes. Are you sure you want to leave?',
      createError: 'Could not create center',
      updateError: 'Could not update center',
      deleteError: 'Could not close center',
      loadError: 'Could not load centers',
      notFound: 'Center not found',

      statusAll: 'All',
      statusSetupPending: 'Setup',
      statusActive: 'Active',
      statusSuspended: 'Susp.',
      statusClosed: 'Closed',
    },

    // Staff (nested namespace, accessed via t('staff.title') etc.)
    staff: {
      title: 'Staff',
      titleSingular: 'Staff member',
      create: 'Add staff member',
      edit: 'Edit staff member',
      delete: 'Remove staff member',
      view: 'View details',
      list: 'All staff',
      noStaff: 'No staff members yet',
      createFirst: 'Add your first staff member to get started',

      firstName: 'First name',
      firstNamePlaceholder: 'e.g., Maria',
      lastName: 'Last name',
      lastNamePlaceholder: 'e.g., Gonzalez',
      email: 'Email',
      emailPlaceholder: 'maria@daycare.com',
      phone: 'Phone',
      phonePlaceholder: '(415) 555-1234',
      role: 'Role',
      center: 'Center',
      hireDate: 'Hire date',
      employmentType: 'Employment type',
      hourlyRate: 'Hourly rate',
      hourlyRatePlaceholder: '25.00',
      notes: 'Notes',
      notesPlaceholder: 'Additional information…',
      status: 'Status',
      fieldRequired: 'Required field',

      roleTeacher: 'Teacher',
      roleAssistant: 'Assistant',
      // "Center Admin" disambiguates from the auth-level SUPER_ADMIN role.
      roleAdmin: 'Center Admin',

      employmentFullTime: 'Full-time',
      employmentPartTime: 'Part-time',

      statusInvited: 'Invited',
      statusActive: 'Active',
      statusSuspended: 'Suspended',
      statusTerminated: 'Terminated',

      cancel: 'Cancel',
      save: 'Save changes',
      saving: 'Saving…',
      noChangesHint: 'No changes to save',
      unsavedChangesPrompt:
        'You have unsaved changes. Are you sure you want to leave?',

      createdToast: 'Staff member added',
      updatedToast: 'Staff member updated',
      deletedToast: 'Staff member removed',
      loadError: 'Could not load staff',
      notFound: 'Staff member not found',
      createError: 'Could not add staff member',
      updateError: 'Could not update staff member',
      deleteError: 'Could not remove staff member',

      confirmRemoveTitle: 'Remove staff member?',
      confirmRemoveDescription:
        'This will mark {name} as terminated and disable their account. This action cannot be undone via the UI.',
      confirmRemoveBtn: 'Yes, remove',
    },

    // Admin tools (SUPER_ADMIN only). Accessed via t('admin.*').
    admin: {
      title: 'Admin',
      lockedAccountsNav: 'Locked accounts',
      lockedAccountsTitle: 'Locked accounts',
      lockedAccountsDescription:
        'Users currently locked out by repeated failed login attempts. Unlock to restore access immediately.',
      noLockedAccounts: 'No locked accounts. Nice and quiet.',
      colEmail: 'Email',
      colRole: 'Role',
      colCenter: 'Center',
      colRemaining: 'Lock remaining',
      colLastLogin: 'Last login',
      colActions: 'Actions',
      unlock: 'Unlock',
      confirmUnlock:
        'Unlock {email}? This will reset their failed-login counter and grant immediate access. The action is recorded in the audit log.',
      unlockedToast: 'Account unlocked',
      unlockError: 'Could not unlock account',
    },

    setup: {
      // First-time onboarding welcome (on /centers/new when DIRECTOR has 0 centers)
      welcomeTitle: '🎉 Welcome to KinderCtrl!',
      welcomeDescription:
        'Set up your first center to access the rest of the app.',

      // Banner on center detail page
      pendingTitle: 'Setup pending — finish onboarding',
      pendingDescription:
        'Set your operating hours below to activate this center and unlock all features.',
      pendingCta: 'Set hours now',

      // Hours form
      hoursFormTitle: 'Set operating hours',
      hoursTriggerButton: 'Set Hours',
      editHoursTrigger: 'Edit Hours',
      hoursFormHelp:
        'Pick the days you are open and set the time range. Saving the hours will mark this center as Active.',
      hoursFormSubmit: 'Save hours and activate',
      hoursFormSaving: 'Saving…',
      hoursFormSaved: 'Saved',
      hoursSavedToast: 'Operating hours saved successfully',
      hoursDiscardTitle: 'Discard changes?',
      hoursDiscardDescription:
        'You have unsaved changes. Are you sure you want to leave?',
      hoursDiscardConfirm: 'Discard changes',
      hoursDiscardCancel: 'Keep editing',
      hoursFormError: 'Could not save hours',

      day_sunday: 'Sunday',
      day_monday: 'Monday',
      day_tuesday: 'Tuesday',
      day_wednesday: 'Wednesday',
      day_thursday: 'Thursday',
      day_friday: 'Friday',
      day_saturday: 'Saturday',
      dayClosed: 'Closed',

      errOneDayMin: 'Pick at least one open day.',
      errOpenBeforeClose: '{day}: opening time must be before closing time.',

      // Dashboard banner
      dashboardNoCenterTitle: 'No center yet',
      dashboardNoCenterDescription:
        'Create your first center to start managing children, staff and billing.',
      dashboardCreateCenter: 'Create center',
      dashboardCompleteTitle: 'Complete your setup',
      dashboardCompleteDescription:
        'Set operating hours for {name} to unlock all features.',
      dashboardContinue: 'Continue setup',
    },
  },
  es: {
    // Locale meta
    code: 'es',
    label: 'Español',
    short: 'ES',
    flag: '🇪🇸',
    language: 'Idioma',

    // Login
    welcome: 'Bienvenido de nuevo',
    subtitle: 'Inicia sesión para continuar.',
    email: 'Email',
    emailPh: 'tu@email.com',
    password: 'Contraseña',
    passwordPh: 'Ingresa tu contraseña',
    show: 'Mostrar',
    hide: 'Ocultar',
    remember: 'Recordarme',
    forgot: '¿Olvidaste tu contraseña?',
    signIn: 'Iniciar sesión',
    signingIn: 'Iniciando sesión…',
    welcomeBack: '✓ ¡Bienvenida!',
    or: 'o',
    create: 'Crear cuenta nueva',
    terms: 'Términos',
    privacy: 'Política de privacidad',
    err: 'Email o contraseña incorrectos.',
    errHint: 'Comprueba tus datos o restablece la contraseña.',
    noAccount: '¿No tienes cuenta?',
    requestDemo: 'Solicita una demo →',

    // Brand / hero side
    forFamilies: 'PARA DIRECTORES, PERSONAL Y FAMILIAS',
    heroA: 'Control total.',
    heroB: 'Paz completa.',
    heroP: 'La plataforma todo-en-uno para gestionar tu guardería: asistencia, reportes diarios, comunicación con familias y facturación, todo en un solo lugar.',
    todayInSteps: 'HOY EN PEQUEÑOS PASOS',
    live: 'en vivo',
    daycare: 'GUARDERÍAS · SaaS',

    // Signup
    heading: 'Crea tu cuenta',
    sub: 'Únete en minutos.',
    confirmPassword: 'Confirmar contraseña',
    confirmPh: 'Repite tu contraseña',
    confirmErr: 'Las contraseñas no coinciden.',
    firstName: 'Nombre (opcional)',
    firstNamePh: 'Juan',
    lastName: 'Apellido (opcional)',
    lastNamePh: 'Pérez',
    roleLabel: 'Soy…',
    roleDirector: 'Director',
    roleStaff: 'Personal',
    roleParent: 'Padre/Madre',
    strengthWeak: 'Débil',
    strengthMed: 'Media',
    strengthStrong: 'Fuerte',
    reqLength: 'Mínimo 8 caracteres',
    reqUpper: 'Una letra mayúscula',
    reqNumber: 'Un número',
    createAccount: 'Crear cuenta',
    creating: 'Creando cuenta…',
    hasAccount: '¿Ya tienes cuenta?',
    signInLink: 'Inicia sesión',
    emailExists: 'El email ya existe.',
    // Forgot / reset password flow (es).
    forgotTitle: '¿Olvidaste tu contraseña?',
    forgotSubtitle:
      'Ingresá el email de tu cuenta y te mandamos un link para resetearla.',
    forgotSubmit: 'Mandar link de reset',
    forgotSending: 'Enviando…',
    forgotBackToLogin: 'Volver al login',
    forgotSentTitle: 'Revisá tu email',
    forgotSentBody:
      'Si existe una cuenta para ese email, te mandamos un link para resetear la contraseña. El link vence en 1 hora.',
    resetTitle: 'Elegí una nueva contraseña',
    resetSubtitle:
      'Tu nueva contraseña tiene que tener al menos 8 caracteres e incluir mayúscula, minúscula y un número o símbolo.',
    resetNewPassword: 'Nueva contraseña',
    resetSubmit: 'Resetear contraseña',
    resetSubmitting: 'Reseteando…',
    resetTokenInvalid:
      'Este link de reset es inválido o expiró. Pedí uno nuevo.',
    resetDoneTitle: 'Contraseña actualizada',
    resetDoneBody:
      'Tu contraseña se actualizó. Te llevamos al login…',
    resetGoToLogin: 'Iniciar sesión',

    errAccountNotActive:
      'Tu cuenta no está activa. Contactá al administrador.',
    errAccountLocked:
      'Cuenta bloqueada temporalmente por demasiados intentos fallidos. Intentá de nuevo en {minutes} minuto(s).',
    errRateLimited:
      'Demasiados intentos. Esperá {seconds} segundos e intentá de nuevo.',
    errRateLimitedShort: 'Esperá antes de intentar de nuevo.',
    errEmailExists: 'Este email ya está registrado.',
    errGeneric: 'Algo salió mal. Intentá de nuevo.',

    // Centers (nested namespace)
    centers: {
      title: 'Centros',
      titleSingular: 'Centro',
      create: 'Crear centro',
      edit: 'Editar centro',
      delete: 'Cerrar centro',
      view: 'Ver detalles',
      list: 'Todos los centros',
      noCenters: 'Todavía no hay centros',
      createFirst: 'Crea tu primer centro para comenzar',
      noCenterAssigned: 'Sin centro asignado',
      contactAdmin:
        'Todavía no tenés un centro asignado. Contactá al administrador de tu guardería.',

      name: 'Nombre del centro',
      namePlaceholder: 'ej., Guardería Días Soleados',
      street: 'Calle',
      streetPlaceholder: 'Calle Principal 123',
      city: 'Ciudad',
      cityPlaceholder: 'San Francisco',
      state: 'Estado',
      statePlaceholder: 'CA',
      zipCode: 'Código postal',
      zipCodePlaceholder: '94102',
      phone: 'Teléfono',
      phonePlaceholder: '(415) 555-1234',
      email: 'Email',
      emailPlaceholder: 'contacto@centro.com',
      website: 'Sitio web (opcional)',
      websitePlaceholder: 'https://www.ejemplo.com',
      capacity: 'Capacidad máxima',
      capacityPlaceholder: 'Máximo de niños',
      timezone: 'Zona horaria',
      timezoneAutoDetected: 'Detectado por código postal',
      licenseNumber: 'Número de licencia (opcional)',
      licenseNumberPlaceholder: '073409566',
      fieldRequired: 'obligatorio',

      save: 'Guardar centro',
      saving: 'Guardando…',
      cancel: 'Cancelar',
      noChangesHint: 'No hay cambios para guardar',
      confirmDelete: '¿Cerrar {name}?',
      deleteWarning:
        'Este centro quedará marcado como CERRADO. Los niños activos deben ser dados de baja primero.',

      adminActions: 'Acciones de admin',
      changeStatus: 'Cambiar estado',
      currentStatus: 'Actual',
      confirmStatusChange: '¿Cambiar estado?',
      confirmStatusChangeDescription:
        'El estado pasará de "{from}" a "{to}". Esto puede afectar el acceso del personal y las familias.',
      confirmStatusChangeBtn: 'Cambiar estado',
      statusChangedToast: 'Estado actualizado',
      statusChangeError: 'No se pudo cambiar el estado',
      deletedToast: 'Centro cerrado',

      createSuccess: 'Centro creado',
      updateSuccess: 'Centro actualizado',
      deleteSuccess: 'Centro cerrado',
      createdToast: 'Centro creado correctamente',
      updatedToast: 'Cambios guardados correctamente',
      unsavedChangesPrompt:
        'Tenés cambios sin guardar. ¿Seguro que querés salir?',
      createError: 'No se pudo crear el centro',
      updateError: 'No se pudo actualizar el centro',
      deleteError: 'No se pudo cerrar el centro',
      loadError: 'No se pudieron cargar los centros',
      notFound: 'Centro no encontrado',

      statusAll: 'Todos',
      statusSetupPending: 'Config.',
      statusActive: 'Activo',
      statusSuspended: 'Susp.',
      statusClosed: 'Cerrado',
    },

    admin: {
      title: 'Admin',
      lockedAccountsNav: 'Cuentas bloqueadas',
      lockedAccountsTitle: 'Cuentas bloqueadas',
      lockedAccountsDescription:
        'Usuarios bloqueados por demasiados intentos fallidos. Desbloqueá para restaurar el acceso al instante.',
      noLockedAccounts: 'No hay cuentas bloqueadas. Todo tranquilo.',
      colEmail: 'Email',
      colRole: 'Rol',
      colCenter: 'Centro',
      colRemaining: 'Tiempo restante',
      colLastLogin: 'Último login',
      colActions: 'Acciones',
      unlock: 'Desbloquear',
      confirmUnlock:
        '¿Desbloquear {email}? Se va a resetear el contador de intentos fallidos y la cuenta podrá entrar al instante. La acción queda registrada en el audit log.',
      unlockedToast: 'Cuenta desbloqueada',
      unlockError: 'No se pudo desbloquear la cuenta',
    },

    staff: {
      title: 'Personal',
      titleSingular: 'Empleado',
      create: 'Agregar empleado',
      edit: 'Editar empleado',
      delete: 'Eliminar empleado',
      view: 'Ver detalles',
      list: 'Todo el personal',
      noStaff: 'Aún no hay empleados',
      createFirst: 'Agregá tu primer empleado para empezar',

      center: 'Centro',
      firstName: 'Nombre',
      firstNamePlaceholder: 'ej., María',
      lastName: 'Apellido',
      lastNamePlaceholder: 'ej., González',
      email: 'Email',
      emailPlaceholder: 'maria@guarderia.com',
      phone: 'Teléfono',
      phonePlaceholder: '(415) 555-1234',
      role: 'Cargo',
      hireDate: 'Fecha de ingreso',
      employmentType: 'Tipo de contrato',
      hourlyRate: 'Tarifa por hora',
      hourlyRatePlaceholder: '25.00',
      notes: 'Notas',
      notesPlaceholder: 'Información adicional…',
      status: 'Estado',
      fieldRequired: 'Campo obligatorio',

      roleTeacher: 'Profesor/a',
      roleAssistant: 'Asistente',
      roleAdmin: 'Admin del centro',

      employmentFullTime: 'Tiempo completo',
      employmentPartTime: 'Tiempo parcial',

      statusInvited: 'Invitado',
      statusActive: 'Activo',
      statusSuspended: 'Suspendido',
      statusTerminated: 'Terminado',

      cancel: 'Cancelar',
      save: 'Guardar cambios',
      saving: 'Guardando…',
      noChangesHint: 'No hay cambios para guardar',
      unsavedChangesPrompt:
        'Tenés cambios sin guardar. ¿Seguro que querés salir?',

      createdToast: 'Empleado agregado',
      updatedToast: 'Empleado actualizado',
      deletedToast: 'Empleado eliminado',
      loadError: 'No se pudo cargar el personal',
      notFound: 'Empleado no encontrado',
      createError: 'No se pudo agregar el empleado',
      updateError: 'No se pudo actualizar el empleado',
      deleteError: 'No se pudo eliminar el empleado',

      confirmRemoveTitle: '¿Eliminar empleado?',
      confirmRemoveDescription:
        'Esto va a marcar a {name} como terminado y deshabilitar su cuenta. Esta acción no se puede deshacer desde la UI.',
      confirmRemoveBtn: 'Sí, eliminar',
    },

    setup: {
      // Bienvenida primer-uso (en /centers/new cuando DIRECTOR tiene 0 centros)
      welcomeTitle: '🎉 ¡Bienvenido a KinderCtrl!',
      welcomeDescription:
        'Configura tu primer centro para acceder al resto de la aplicación.',

      // Banner en detalle de centro
      pendingTitle: 'Configuración pendiente — termina el alta',
      pendingDescription:
        'Configura los horarios de operación más abajo para activar este centro y desbloquear todas las funciones.',
      pendingCta: 'Configurar horarios',

      // Formulario de horarios
      hoursFormTitle: 'Configurar horarios de operación',
      hoursTriggerButton: 'Configurar horarios',
      editHoursTrigger: 'Editar horarios',
      hoursFormHelp:
        'Elige los días que abres y define el rango horario. Al guardar los horarios el centro pasa a Activo.',
      hoursFormSubmit: 'Guardar horarios y activar',
      hoursFormSaving: 'Guardando…',
      hoursFormSaved: 'Guardado',
      hoursSavedToast: 'Horarios guardados correctamente',
      hoursDiscardTitle: '¿Descartar cambios?',
      hoursDiscardDescription:
        'Tenés cambios sin guardar. ¿Seguro que querés salir?',
      hoursDiscardConfirm: 'Descartar cambios',
      hoursDiscardCancel: 'Seguir editando',
      hoursFormError: 'No se pudieron guardar los horarios',

      day_sunday: 'Domingo',
      day_monday: 'Lunes',
      day_tuesday: 'Martes',
      day_wednesday: 'Miércoles',
      day_thursday: 'Jueves',
      day_friday: 'Viernes',
      day_saturday: 'Sábado',
      dayClosed: 'Cerrado',

      errOneDayMin: 'Selecciona al menos un día abierto.',
      errOpenBeforeClose:
        '{day}: la hora de apertura debe ser anterior a la de cierre.',

      // Banner del dashboard
      dashboardNoCenterTitle: 'Aún no tienes centro',
      dashboardNoCenterDescription:
        'Crea tu primer centro para empezar a gestionar niños, personal y facturación.',
      dashboardCreateCenter: 'Crear centro',
      dashboardCompleteTitle: 'Completa la configuración',
      dashboardCompleteDescription:
        'Configura los horarios de {name} para desbloquear todas las funciones.',
      dashboardContinue: 'Continuar configuración',
    },
  },
} as const;
