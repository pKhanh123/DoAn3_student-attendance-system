using System;

namespace EducationManagement.Common.Helpers
{
	public static class IdGenerator
	{
		/// <summary>
		/// Generate a short, readable ID with a prefix, using 8 chars of a GUID.
		/// Example: role-1a2b3c4d
		/// </summary>
		public static string Generate(string prefix)
		{
			var shortGuid = Guid.NewGuid().ToString("N").Substring(0, 8);
			return string.IsNullOrWhiteSpace(prefix)
				? shortGuid
				: $"{prefix}-{shortGuid}";
		}
	}
}



